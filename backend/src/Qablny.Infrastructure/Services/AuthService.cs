using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Qablny.Application.DTOs;
using Qablny.Application.Interfaces;
using Qablny.Domain.Entities;
using Qablny.Infrastructure.Data;

namespace Qablny.Infrastructure.Services;

public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest req, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email.ToLower(), ct))
            throw new InvalidOperationException("البريد الإلكتروني مستخدم بالفعل");

        var user = new User
        {
            Email        = req.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Name         = req.Name,
            Age          = req.Age,
            Gender       = req.Gender,
            Location     = req.Location,
            IsEmailVerified = true // skip OTP for now
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest req, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower(), ct)
            ?? throw new UnauthorizedAccessException("بيانات الدخول غير صحيحة");

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("بيانات الدخول غير صحيحة");

        if (user.IsBlocked)
            throw new UnauthorizedAccessException("تم حظر هذا الحساب");

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked && rt.ExpiresAt > DateTime.UtcNow, ct)
            ?? throw new UnauthorizedAccessException("Refresh token غير صالح أو منتهي");

        token.IsRevoked = true;
        await db.SaveChangesAsync(ct);

        return await BuildAuthResponseAsync(token.User, ct);
    }

    public async Task RevokeTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await db.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken, ct);
        if (token is not null)
        {
            token.IsRevoked = true;
            await db.SaveChangesAsync(ct);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<AuthResponse> BuildAuthResponseAsync(User user, CancellationToken ct)
    {
        var accessToken = GenerateJwt(user);
        var refreshToken = await CreateRefreshTokenAsync(user.Id, ct);
        var expiry = DateTime.UtcNow.AddMinutes(GetJwtExpiryMinutes());

        return new AuthResponse(accessToken, refreshToken, expiry, MapToDto(user));
    }

    private string GenerateJwt(User user)
    {
        var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds   = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(GetJwtExpiryMinutes());

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name", user.Name),
            new Claim("isVip", user.IsVip.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:   config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims:   claims,
            expires:  expires,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<string> CreateRefreshTokenAsync(Guid userId, CancellationToken ct)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId    = userId,
            Token     = token,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        });

        await db.SaveChangesAsync(ct);
        return token;
    }

    private int GetJwtExpiryMinutes() =>
        int.TryParse(config["Jwt:ExpiryMinutes"], out var m) ? m : 60;

    private static UserDto MapToDto(User u) => new(
        u.Id, u.Name, u.Bio, u.ProfileImageUrl,
        u.Age, u.Gender, u.Location, u.Interests,
        u.Coins, u.IsVip, u.IsOnline, u.LastSeen, u.JoinedAt, u.TotalMatches
    );
}
