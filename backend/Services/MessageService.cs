using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.DTOs;
using Qablny.Entities;
using Qablny.Enums;

namespace Qablny.Services;

public class MessageService(AppDbContext db, IHttpClientFactory http, PushNotificationService pushNotification)
{
    public async Task<List<ConversationDto>> GetConversationsAsync(Guid userId, CancellationToken ct = default)
    {
        var convs = await db.Conversations
            .Include(c => c.User1).Include(c => c.User2)
            .Where(c => c.User1Id == userId || c.User2Id == userId)
            .OrderByDescending(c => c.LastMessageAt)
            .ToListAsync(ct);

        var result = new List<ConversationDto>();
        foreach (var conv in convs)
        {
            var friend = conv.User1Id == userId ? conv.User2 : conv.User1;
            var unread = await db.Messages.CountAsync(m =>
                m.ConversationId == conv.Id && m.ReceiverId == userId && !m.IsRead, ct);
            var last = await db.Messages
                .Where(m => m.ConversationId == conv.Id)
                .OrderByDescending(m => m.CreatedAt).FirstOrDefaultAsync(ct);

            result.Add(new ConversationDto(conv.Id,
                new FriendDto(friend.Id, friend.Name, friend.ProfileImageUrl,
                    friend.Gender, friend.Location, friend.Age,
                    friend.IsOnline, "", unread, null),
                last is null ? null : ToDto(last, userId), unread));
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
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(m => ToDto(m, userId))
            .ToListAsync(ct);
    }

    public async Task<MessageDto> SendAsync(
        Guid senderId, Guid receiverId, SendMessageRequest req, CancellationToken ct = default)
    {
        var conv = await GetOrCreateConversationAsync(senderId, receiverId, ct);

        string? translation = null;
        if (req.Type == MessageType.Text && !string.IsNullOrEmpty(req.Content))
            translation = await TranslateAsync(req.Content, "en", ct);

        var msg = new Message
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
        db.Messages.Add(msg);
        conv.LastMessageAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Send push notification
        var receiver = await db.Users.FindAsync([receiverId], ct);
        var sender = await db.Users.FindAsync([senderId], ct);
        if (receiver?.ExpoPushToken != null && sender != null)
        {
            var title = $"رسالة جديدة من {sender.Name}";
            var body = req.Type == MessageType.Text ? req.Content : $"أرسل لك {req.Type}";
            await pushNotification.SendPushAsync(receiver.ExpoPushToken, title, body ?? "رسالة جديدة", new { type = "message", friendId = senderId });
        }

        return ToDto(msg, senderId);
    }

    public async Task MarkReadAsync(Guid userId, Guid friendId, CancellationToken ct = default) =>
        await db.Messages
            .Where(m => m.SenderId == friendId && m.ReceiverId == userId && !m.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true), ct);

    public async Task<string?> TranslateAsync(string text, string target = "en", CancellationToken ct = default)
    {
        try
        {
            var client   = http.CreateClient("LibreTranslate");
            var response = await client.PostAsJsonAsync("/translate",
                new { q = text, source = "auto", target, format = "text" }, ct);
            if (!response.IsSuccessStatusCode) return null;
            var result = await response.Content.ReadFromJsonAsync<LibreTranslateResult>(ct);
            return result?.TranslatedText;
        }
        catch { return null; }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task<Conversation> GetOrCreateConversationAsync(Guid a, Guid b, CancellationToken ct)
    {
        var (min, max) = a < b ? (a, b) : (b, a);
        var conv = await db.Conversations.FirstOrDefaultAsync(c => c.User1Id == min && c.User2Id == max, ct);
        if (conv is not null) return conv;
        conv = new Conversation { User1Id = min, User2Id = max };
        db.Conversations.Add(conv);
        await db.SaveChangesAsync(ct);
        return conv;
    }

    private static MessageDto ToDto(Message m, Guid me) => new(
        m.Id, m.ConversationId, m.SenderId, m.ReceiverId,
        m.Type, m.Content, m.Translation, m.DurationSeconds,
        m.MediaUrl, m.LocationName, m.LocationLat, m.LocationLng,
        m.IsRead, m.CreatedAt, m.SenderId == me);

    private record LibreTranslateResult(string TranslatedText);
}
