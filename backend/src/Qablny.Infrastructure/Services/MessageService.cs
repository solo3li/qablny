using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Qablny.Application.DTOs;
using Qablny.Application.Interfaces;
using Qablny.Domain.Entities;
using Qablny.Domain.Enums;
using Qablny.Infrastructure.Data;

namespace Qablny.Infrastructure.Services;

public class MessageService(
    AppDbContext db,
    IFileStorageService storage,
    IHttpClientFactory httpFactory) : IMessageService
{
    public async Task<List<ConversationDto>> GetConversationsAsync(Guid userId, CancellationToken ct = default)
    {
        var conversations = await db.Conversations
            .Include(c => c.User1)
            .Include(c => c.User2)
            .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .Where(c => c.User1Id == userId || c.User2Id == userId)
            .OrderByDescending(c => c.LastMessageAt)
            .ToListAsync(ct);

        var result = new List<ConversationDto>();
        foreach (var conv in conversations)
        {
            var friend = conv.User1Id == userId ? conv.User2 : conv.User1;
            var unread  = await db.Messages.CountAsync(m =>
                m.ConversationId == conv.Id &&
                m.ReceiverId == userId && !m.IsRead, ct);
            var lastMsg = conv.Messages.FirstOrDefault();

            result.Add(new ConversationDto(
                conv.Id,
                new FriendDto(friend.Id, friend.Name, friend.ProfileImageUrl,
                    friend.Gender, friend.Location, friend.Age,
                    friend.IsOnline, "", unread, null),
                lastMsg is null ? null : MapMessage(lastMsg, userId),
                unread
            ));
        }

        return result;
    }

    public async Task<List<MessageDto>> GetMessagesAsync(
        Guid userId, Guid friendId, int page = 1, int pageSize = 50, CancellationToken ct = default)
    {
        var conv = await GetOrCreateConversationAsync(userId, friendId, ct);

        return await db.Messages
            .Where(m => m.ConversationId == conv.Id)
            .OrderBy(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => MapMessage(m, userId))
            .ToListAsync(ct);
    }

    public async Task<MessageDto> SendMessageAsync(
        Guid senderId, Guid receiverId, SendMessageRequest req, CancellationToken ct = default)
    {
        var conv = await GetOrCreateConversationAsync(senderId, receiverId, ct);

        // Auto-translate if text message
        string? translation = null;
        if (req.Type == MessageType.Text && !string.IsNullOrEmpty(req.Content))
            translation = await TranslateMessageAsync(req.Content, "en", ct);

        var message = new Message
        {
            ConversationId  = conv.Id,
            SenderId        = senderId,
            ReceiverId      = receiverId,
            Type            = req.Type,
            Content         = req.Content,
            Translation     = translation,
            DurationSeconds = req.DurationSeconds,
            MediaUrl        = req.MediaUrl,
            LocationName    = req.LocationName,
            LocationLat     = req.LocationLat,
            LocationLng     = req.LocationLng,
        };

        db.Messages.Add(message);
        conv.LastMessageAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return MapMessage(message, senderId);
    }

    public async Task MarkReadAsync(Guid userId, Guid friendId, CancellationToken ct = default)
    {
        await db.Messages
            .Where(m => m.SenderId == friendId && m.ReceiverId == userId && !m.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true), ct);
    }

    public async Task<string?> TranslateMessageAsync(string text, string targetLang = "en", CancellationToken ct = default)
    {
        try
        {
            var client = httpFactory.CreateClient("LibreTranslate");
            var response = await client.PostAsJsonAsync("/translate", new
            {
                q      = text,
                source = "auto",
                target = targetLang,
                format = "text"
            }, ct);

            if (!response.IsSuccessStatusCode) return null;

            var result = await response.Content.ReadFromJsonAsync<LibreTranslateResponse>(ct);
            return result?.TranslatedText;
        }
        catch
        {
            return null; // translation is optional
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────
    private async Task<Conversation> GetOrCreateConversationAsync(Guid u1, Guid u2, CancellationToken ct)
    {
        var (min, max) = u1 < u2 ? (u1, u2) : (u2, u1);

        var conv = await db.Conversations.FirstOrDefaultAsync(c =>
            (c.User1Id == min && c.User2Id == max), ct);

        if (conv is null)
        {
            conv = new Conversation { User1Id = min, User2Id = max };
            db.Conversations.Add(conv);
            await db.SaveChangesAsync(ct);
        }

        return conv;
    }

    private static MessageDto MapMessage(Message m, Guid currentUserId) => new(
        m.Id, m.ConversationId, m.SenderId, m.ReceiverId,
        m.Type, m.Content, m.Translation, m.DurationSeconds,
        m.MediaUrl, m.LocationName, m.LocationLat, m.LocationLng,
        m.IsRead, m.CreatedAt, m.SenderId == currentUserId
    );

    private record LibreTranslateResponse(string TranslatedText);
}
