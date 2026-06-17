using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Qablny.Data;
using Qablny.DTOs;
using Qablny.Entities;

namespace Qablny.Services;

public class AuthService(AppDbContext db, IConfiguration config)
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
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return await BuildResponseAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest req, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower(), ct)
            ?? throw new UnauthorizedAccessException("بيانات الدخول غير صحيحة");

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("بيانات الدخول غير صحيحة");

        if (user.IsBlocked) throw new UnauthorizedAccessException("تم حظر هذا الحساب");

        return await BuildResponseAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(string token, CancellationToken ct = default)
    {
        var rt = await db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == token && !r.IsRevoked && r.ExpiresAt > DateTime.UtcNow, ct)
            ?? throw new UnauthorizedAccessException("Refresh token منتهي أو غير صالح");

        rt.IsRevoked = true;
        await db.SaveChangesAsync(ct);
        return await BuildResponseAsync(rt.User, ct);
    }

    public async Task RevokeAsync(string token, CancellationToken ct = default)
    {
        var rt = await db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == token, ct);
        if (rt is null) return;
        rt.IsRevoked = true;
        await db.SaveChangesAsync(ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task<AuthResponse> BuildResponseAsync(User user, CancellationToken ct)
    {
        var access  = GenerateJwt(user);
        var refresh = await CreateRefreshTokenAsync(user.Id, ct);
        var expiry  = DateTime.UtcNow.AddMinutes(JwtExpiry());
        return new AuthResponse(access, refresh, expiry, UserService.ToDto(user));
    }

    private string GenerateJwt(User user)
    {
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name",  user.Name),
            new Claim("isVip", user.IsVip.ToString().ToLower()),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };
        var token = new JwtSecurityToken(
            issuer:             config["Jwt:Issuer"],
            audience:           config["Jwt:Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddMinutes(JwtExpiry()),
            signingCredentials: creds);
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

    private int JwtExpiry() =>
        int.TryParse(config["Jwt:ExpiryMinutes"], out var m) ? m : 60;
}
