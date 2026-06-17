using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.DTOs;
using Qablny.Entities;
using Qablny.Enums;

namespace Qablny.Services;

public class UserService(AppDbContext db, MinioStorageService storage)
{
    public async Task<UserDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var u = await db.Users.FindAsync([id], ct) ?? throw new KeyNotFoundException("المستخدم غير موجود");
        return ToDto(u);
    }

    public async Task<UserDto> UpdateAsync(Guid userId, UpdateProfileRequest req, CancellationToken ct = default)
    {
        var u = await db.Users.FindAsync([userId], ct) ?? throw new KeyNotFoundException("المستخدم غير موجود");
        if (req.Name      is not null) u.Name      = req.Name;
        if (req.Bio       is not null) u.Bio       = req.Bio;
        if (req.Location  is not null) u.Location  = req.Location;
        if (req.Interests is not null) u.Interests = req.Interests;
        if (req.Age.HasValue)          u.Age       = req.Age.Value;
        await db.SaveChangesAsync(ct);
        await db.SaveChangesAsync(ct);
        return ToDto(u);
    }

    public async Task UpdatePushTokenAsync(Guid userId, string token, CancellationToken ct = default)
    {
        var u = await db.Users.FindAsync([userId], ct) ?? throw new KeyNotFoundException("المستخدم غير موجود");
        u.ExpoPushToken = token;
        await db.SaveChangesAsync(ct);
    }

    public async Task<string> UploadImageAsync(Guid userId, Stream stream, string contentType, CancellationToken ct = default)
    {
        var u   = await db.Users.FindAsync([userId], ct) ?? throw new KeyNotFoundException();
        var ext = contentType switch { "image/png" => ".png", "image/webp" => ".webp", _ => ".jpg" };
        var url = await storage.UploadAsync(stream, $"avatars/{userId}{ext}", contentType, ct: ct);
        u.ProfileImageUrl = url;
        await db.SaveChangesAsync(ct);
        return url;
    }

    public async Task DeleteAsync(Guid userId, CancellationToken ct = default)
    {
        var u = await db.Users.FindAsync([userId], ct) ?? throw new KeyNotFoundException();
        db.Users.Remove(u);
        await db.SaveChangesAsync(ct);
    }

    public static UserDto ToDto(User u) => new(
        u.Id, u.Name, u.Bio, u.ProfileImageUrl,
        u.Age, u.Gender, u.Location, u.Interests,
        u.Coins, u.IsVip, u.IsOnline, u.LastSeen, u.JoinedAt, u.TotalMatches);
}

public class FriendService(AppDbContext db, PresenceService presence)
{
    public async Task<List<FriendDto>> GetFriendsAsync(Guid userId, CancellationToken ct = default)
    {
        var fs = await db.Friendships
            .Include(f => f.Requester).Include(f => f.Addressee)
            .Where(f => (f.RequesterId == userId || f.AddresseeId == userId) && f.Status == FriendshipStatus.Accepted)
            .ToListAsync(ct);

        var result = new List<FriendDto>();
        foreach (var f in fs)
        {
            var friend  = f.RequesterId == userId ? f.Addressee : f.Requester;
            var online  = await presence.IsOnlineAsync(friend.Id, ct);
            var unread  = await db.Messages.CountAsync(m => m.SenderId == friend.Id && m.ReceiverId == userId && !m.IsRead, ct);
            var lastMsg = await db.Messages
                .Where(m => (m.SenderId == userId && m.ReceiverId == friend.Id) ||
                            (m.SenderId == friend.Id && m.ReceiverId == userId))
                .OrderByDescending(m => m.CreatedAt).FirstOrDefaultAsync(ct);

            result.Add(new FriendDto(friend.Id, friend.Name, friend.ProfileImageUrl,
                friend.Gender, friend.Location, friend.Age,
                online, FormatLastSeen(friend.LastSeen, online),
                unread, FormatLastMsg(lastMsg)));
        }
        return [.. result.OrderByDescending(f => f.IsOnline)];
    }

    public async Task<List<FriendDto>> GetPendingAsync(Guid userId, CancellationToken ct = default)
    {
        return await db.Friendships
            .Include(f => f.Requester)
            .Where(f => f.AddresseeId == userId && f.Status == FriendshipStatus.Pending)
            .Select(f => new FriendDto(f.Requester.Id, f.Requester.Name, f.Requester.ProfileImageUrl,
                f.Requester.Gender, f.Requester.Location, f.Requester.Age, false, "", 0, null))
            .ToListAsync(ct);
    }

    public async Task SendRequestAsync(Guid from, Guid to, CancellationToken ct = default)
    {
        if (from == to) throw new InvalidOperationException("لا يمكن إرسال طلب لنفسك");
        var exists = await db.Friendships.AnyAsync(f =>
            (f.RequesterId == from && f.AddresseeId == to) ||
            (f.RequesterId == to   && f.AddresseeId == from), ct);
        if (exists) throw new InvalidOperationException("طلب الصداقة موجود بالفعل أو أنتم أصدقاء");

        db.Friendships.Add(new Friendship { RequesterId = from, AddresseeId = to });
        await db.SaveChangesAsync(ct);
    }

    public async Task AcceptAsync(Guid userId, Guid requesterId, CancellationToken ct = default)
    {
        var f = await db.Friendships.FirstOrDefaultAsync(f =>
            f.RequesterId == requesterId && f.AddresseeId == userId && f.Status == FriendshipStatus.Pending, ct)
            ?? throw new KeyNotFoundException("طلب الصداقة غير موجود");
        f.Status    = FriendshipStatus.Accepted;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task DeclineAsync(Guid userId, Guid requesterId, CancellationToken ct = default)
    {
        var f = await db.Friendships.FirstOrDefaultAsync(f =>
            f.RequesterId == requesterId && f.AddresseeId == userId && f.Status == FriendshipStatus.Pending, ct)
            ?? throw new KeyNotFoundException();
        db.Friendships.Remove(f);
        await db.SaveChangesAsync(ct);
    }

    public async Task RemoveAsync(Guid userId, Guid friendId, CancellationToken ct = default)
    {
        var f = await db.Friendships.FirstOrDefaultAsync(f =>
            (f.RequesterId == userId && f.AddresseeId == friendId) ||
            (f.RequesterId == friendId && f.AddresseeId == userId), ct)
            ?? throw new KeyNotFoundException();
        db.Friendships.Remove(f);
        await db.SaveChangesAsync(ct);
    }

    public Task<bool> AreFriendsAsync(Guid a, Guid b, CancellationToken ct = default) =>
        db.Friendships.AnyAsync(f =>
            ((f.RequesterId == a && f.AddresseeId == b) || (f.RequesterId == b && f.AddresseeId == a))
            && f.Status == FriendshipStatus.Accepted, ct);

    // helpers
    private static string FormatLastSeen(DateTime t, bool online) =>
        online ? "متصل الآن" :
        DateTime.UtcNow - t is var d && d.TotalMinutes < 60 ? $"منذ {(int)d.TotalMinutes} دقيقة" :
        d.TotalHours < 24 ? $"منذ {(int)d.TotalHours} ساعة" : $"منذ {(int)d.TotalDays} يوم";

    private static string? FormatLastMsg(Message? m) => m?.Type switch
    {
        null            => null,
        MessageType.Text     => m.Content,
        MessageType.Image    => "🖼️ أرسل صورة",
        MessageType.Video    => "🎬 أرسل فيديو",
        MessageType.Voice    => "🎵 رسالة صوتية",
        MessageType.Location => "📍 أرسل موقع",
        _                    => m.Content
    };
}
