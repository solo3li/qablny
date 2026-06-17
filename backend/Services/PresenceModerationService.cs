using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.DTOs;
using Qablny.Entities;
using Qablny.Enums;
using StackExchange.Redis;

namespace Qablny.Services;

// ─── PresenceService ─────────────────────────────────────────────────────────
public class PresenceService(IConnectionMultiplexer redis)
{
    private static string Key(Guid id) => $"presence:{id}";

    public async Task SetOnlineAsync(Guid userId, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        await db.StringSetAsync(Key(userId), "1", TimeSpan.FromSeconds(60));
    }

    public async Task SetOfflineAsync(Guid userId, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync(Key(userId));
    }

    public async Task<bool> IsOnlineAsync(Guid userId, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        return await db.KeyExistsAsync(Key(userId));
    }

    public async Task RefreshAsync(Guid userId, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        await db.KeyExpireAsync(Key(userId), TimeSpan.FromSeconds(60));
    }
}

// ─── ModerationService ───────────────────────────────────────────────────────
public class ModerationService(AppDbContext db)
{
    public async Task ReportAsync(Guid reporterId, Guid reportedId, ReportRequest req, CancellationToken ct = default)
    {
        if (reporterId == reportedId) throw new InvalidOperationException("لا يمكن الإبلاغ عن نفسك");

        db.Reports.Add(new Report
        {
            ReporterId     = reporterId,
            ReportedUserId = reportedId,
            Reason         = req.Reason
        });
        await db.SaveChangesAsync(ct);
    }

    public async Task BlockAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default)
    {
        if (blockerId == blockedId) throw new InvalidOperationException();

        var exists = await db.UserBlocks.AnyAsync(b =>
            b.BlockerId == blockerId && b.BlockedUserId == blockedId, ct);
        if (!exists)
        {
            db.UserBlocks.Add(new UserBlock { BlockerId = blockerId, BlockedUserId = blockedId });
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task UnblockAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default)
    {
        var block = await db.UserBlocks.FirstOrDefaultAsync(b =>
            b.BlockerId == blockerId && b.BlockedUserId == blockedId, ct);
        if (block is null) return;
        db.UserBlocks.Remove(block);
        await db.SaveChangesAsync(ct);
    }

    public async Task<List<BlockedUserDto>> GetBlockedAsync(Guid userId, CancellationToken ct = default) =>
        await db.UserBlocks
            .Include(b => b.BlockedUser)
            .Where(b => b.BlockerId == userId)
            .Select(b => new BlockedUserDto(b.BlockedUser.Id, b.BlockedUser.Name, b.BlockedUser.ProfileImageUrl))
            .ToListAsync(ct);

    public Task<bool> IsBlockedAsync(Guid a, Guid b, CancellationToken ct = default) =>
        db.UserBlocks.AnyAsync(ub =>
            (ub.BlockerId == a && ub.BlockedUserId == b) ||
            (ub.BlockerId == b && ub.BlockedUserId == a), ct);
}
