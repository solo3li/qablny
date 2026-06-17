using Microsoft.EntityFrameworkCore;
using Qablny.Application.DTOs;
using Qablny.Application.Interfaces;
using Qablny.Domain.Entities;
using Qablny.Infrastructure.Data;

namespace Qablny.Infrastructure.Services;

public class UserService(AppDbContext db, IFileStorageService storage) : IUserService
{
    public async Task<UserDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([id], ct)
            ?? throw new KeyNotFoundException("المستخدم غير موجود");
        return MapToDto(user);
    }

    public async Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest req, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new KeyNotFoundException("المستخدم غير موجود");

        if (req.Name is not null)      user.Name      = req.Name;
        if (req.Bio is not null)       user.Bio       = req.Bio;
        if (req.Location is not null)  user.Location  = req.Location;
        if (req.Interests is not null) user.Interests = req.Interests;
        if (req.Age.HasValue)          user.Age       = req.Age.Value;

        await db.SaveChangesAsync(ct);
        return MapToDto(user);
    }

    public async Task<string> UploadProfileImageAsync(Guid userId, Stream imageStream, string contentType, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new KeyNotFoundException("المستخدم غير موجود");

        var ext = contentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png"  => ".png",
            "image/webp" => ".webp",
            _            => ".jpg"
        };

        var fileName  = $"avatars/{userId}{ext}";
        var publicUrl = await storage.UploadAsync(imageStream, fileName, contentType, ct: ct);

        user.ProfileImageUrl = publicUrl;
        await db.SaveChangesAsync(ct);

        return publicUrl;
    }

    public async Task DeleteAccountAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct)
            ?? throw new KeyNotFoundException("المستخدم غير موجود");

        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);
    }

    internal static UserDto MapToDto(User u) => new(
        u.Id, u.Name, u.Bio, u.ProfileImageUrl,
        u.Age, u.Gender, u.Location, u.Interests,
        u.Coins, u.IsVip, u.IsOnline, u.LastSeen, u.JoinedAt, u.TotalMatches
    );
}
