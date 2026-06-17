using Microsoft.EntityFrameworkCore;
using Qablny.Application.DTOs;
using Qablny.Application.Interfaces;
using Qablny.Domain.Entities;
using Qablny.Domain.Enums;
using Qablny.Infrastructure.Data;
using StackExchange.Redis;

namespace Qablny.Infrastructure.Services;

public class FriendService(AppDbContext db, IPresenceService presence) : IFriendService
{
    public async Task<List<FriendDto>> GetFriendsAsync(Guid userId, CancellationToken ct = default)
    {
        var friendships = await db.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .Where(f => (f.RequesterId == userId || f.AddresseeId == userId)
                     && f.Status == FriendshipStatus.Accepted)
            .ToListAsync(ct);

        var result = new List<FriendDto>();
        foreach (var f in friendships)
        {
            var friend = f.RequesterId == userId ? f.Addressee : f.Requester;
            var isOnline = await presence.IsOnlineAsync(friend.Id, ct);

            // get unread count
            var unread = await db.Messages
                .CountAsync(m => m.SenderId == friend.Id && m.ReceiverId == userId && !m.IsRead, ct);

            // get last message
            var lastMsg = await db.Messages
                .Where(m => (m.SenderId == userId && m.ReceiverId == friend.Id) ||
                            (m.SenderId == friend.Id && m.ReceiverId == userId))
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync(ct);

            result.Add(new FriendDto(
                friend.Id, friend.Name, friend.ProfileImageUrl,
                friend.Gender, friend.Location, friend.Age,
                isOnline,
                FormatLastSeen(friend.LastSeen, isOnline),
                unread,
                FormatLastMessage(lastMsg)
            ));
        }

        return [.. result.OrderByDescending(f => f.IsOnline)];
    }

    public async Task<List<FriendDto>> GetPendingRequestsAsync(Guid userId, CancellationToken ct = default)
    {
        var pending = await db.Friendships
            .Include(f => f.Requester)
            .Where(f => f.AddresseeId == userId && f.Status == FriendshipStatus.Pending)
            .ToListAsync(ct);

        return pending.Select(f => new FriendDto(
            f.Requester.Id, f.Requester.Name, f.Requester.ProfileImageUrl,
            f.Requester.Gender, f.Requester.Location, f.Requester.Age,
            false, "", 0, null
        )).ToList();
    }

    public async Task SendFriendRequestAsync(Guid requesterId, Guid addresseeId, CancellationToken ct = default)
    {
        if (requesterId == addresseeId)
            throw new InvalidOperationException("لا يمكن إرسال طلب لنفسك");

        var existing = await db.Friendships.FirstOrDefaultAsync(f =>
            (f.RequesterId == requesterId && f.AddresseeId == addresseeId) ||
            (f.RequesterId == addresseeId && f.AddresseeId == requesterId), ct);

        if (existing is not null)
        {
            if (existing.Status == FriendshipStatus.Accepted)
                throw new InvalidOperationException("أنتم أصدقاء بالفعل");
            if (existing.Status == FriendshipStatus.Pending)
                throw new InvalidOperationException("طلب الصداقة مرسل بالفعل");
        }

        db.Friendships.Add(new Friendship
        {
            RequesterId = requesterId,
            AddresseeId = addresseeId,
            Status      = FriendshipStatus.Pending
        });

        await db.SaveChangesAsync(ct);
    }

    public async Task AcceptFriendRequestAsync(Guid userId, Guid requesterId, CancellationToken ct = default)
    {
        var friendship = await db.Friendships.FirstOrDefaultAsync(f =>
            f.RequesterId == requesterId && f.AddresseeId == userId
            && f.Status == FriendshipStatus.Pending, ct)
            ?? throw new KeyNotFoundException("طلب الصداقة غير موجود");

        friendship.Status    = FriendshipStatus.Accepted;
        friendship.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task DeclineFriendRequestAsync(Guid userId, Guid requesterId, CancellationToken ct = default)
    {
        var friendship = await db.Friendships.FirstOrDefaultAsync(f =>
            f.RequesterId == requesterId && f.AddresseeId == userId
            && f.Status == FriendshipStatus.Pending, ct)
            ?? throw new KeyNotFoundException("طلب الصداقة غير موجود");

        db.Friendships.Remove(friendship);
        await db.SaveChangesAsync(ct);
    }

    public async Task RemoveFriendAsync(Guid userId, Guid friendId, CancellationToken ct = default)
    {
        var friendship = await db.Friendships.FirstOrDefaultAsync(f =>
            (f.RequesterId == userId && f.AddresseeId == friendId) ||
            (f.RequesterId == friendId && f.AddresseeId == userId), ct)
            ?? throw new KeyNotFoundException("الصداقة غير موجودة");

        db.Friendships.Remove(friendship);
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> AreFriendsAsync(Guid user1Id, Guid user2Id, CancellationToken ct = default) =>
        await db.Friendships.AnyAsync(f =>
            ((f.RequesterId == user1Id && f.AddresseeId == user2Id) ||
             (f.RequesterId == user2Id && f.AddresseeId == user1Id))
            && f.Status == FriendshipStatus.Accepted, ct);

    // ── Helpers ──────────────────────────────────────────────────────────────
    private static string FormatLastSeen(DateTime lastSeen, bool isOnline)
    {
        if (isOnline) return "متصل الآن";
        var diff = DateTime.UtcNow - lastSeen;
        return diff.TotalMinutes < 60 ? $"منذ {(int)diff.TotalMinutes} دقيقة"
             : diff.TotalHours    < 24 ? $"منذ {(int)diff.TotalHours} ساعة"
             : $"منذ {(int)diff.TotalDays} يوم";
    }

    private static string? FormatLastMessage(Message? msg)
    {
        if (msg is null) return null;
        return msg.Type switch
        {
            MessageType.Text     => msg.Content,
            MessageType.Image    => "🖼️ أرسل صورة",
            MessageType.Video    => "🎬 أرسل فيديو",
            MessageType.Voice    => "🎵 رسالة صوتية",
            MessageType.Location => "📍 أرسل موقع",
            _                   => msg.Content
        };
    }
}
