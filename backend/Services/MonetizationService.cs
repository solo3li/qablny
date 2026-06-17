using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.DTOs;
using Qablny.Entities;
using Qablny.Enums;

namespace Qablny.Services;

// ─── GiftService ──────────────────────────────────────────────────────────────
public class GiftService(AppDbContext db, CoinService coins)
{
    public async Task<List<GiftDto>> GetGiftsAsync(CancellationToken ct = default) =>
        await db.Gifts
            .Where(g => g.IsActive)
            .OrderBy(g => g.CoinCost)
            .Select(g => new GiftDto(g.Id, g.Name, g.Emoji, g.CoinCost))
            .ToListAsync(ct);

    public async Task<GiftDto> SendGiftAsync(Guid senderId, SendGiftRequest req, CancellationToken ct = default)
    {
        var gift = await db.Gifts.FindAsync([req.GiftId], ct)
            ?? throw new KeyNotFoundException("الهدية غير موجودة");

        var ok = await coins.DeductAsync(senderId, gift.CoinCost, $"إرسال هدية: {gift.Name}", ct);
        if (!ok) throw new InvalidOperationException("رصيد العملات غير كافٍ");

        db.GiftTransactions.Add(new GiftTransaction
        {
            SenderId   = senderId,
            ReceiverId = req.ReceiverId,
            GiftId     = gift.Id,
            CoinsSpent = gift.CoinCost
        });

        // give coins to receiver as reward
        await coins.AddAsync(req.ReceiverId, gift.CoinCost / 2, CoinTransactionType.GiftReceived, $"استلام هدية: {gift.Name}", ct);
        await db.SaveChangesAsync(ct);

        return new GiftDto(gift.Id, gift.Name, gift.Emoji, gift.CoinCost);
    }
}

// ─── CoinService ──────────────────────────────────────────────────────────────
public class CoinService(AppDbContext db)
{
    public async Task<CoinBalanceDto> GetBalanceAsync(Guid userId, CancellationToken ct = default)
    {
        var u = await db.Users.FindAsync([userId], ct) ?? throw new KeyNotFoundException();
        return new CoinBalanceDto(u.Coins);
    }

    public async Task<List<CoinTransactionDto>> GetTransactionsAsync(
        Guid userId, int page = 1, int size = 20, CancellationToken ct = default) =>
        await db.CoinTransactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(t => new CoinTransactionDto(t.Id, t.Amount, t.Type, t.Description, t.CreatedAt))
            .ToListAsync(ct);

    public async Task<CoinBalanceDto> PurchaseAsync(Guid userId, PurchaseCoinsRequest req, CancellationToken ct = default)
    {
        // Mock purchase — no real payment gateway
        if (req.Amount is < 10 or > 100000)
            throw new ArgumentException("الكمية يجب أن تكون بين 10 و 100,000");

        await AddAsync(userId, req.Amount, CoinTransactionType.Purchase, "شراء عملات", ct);
        var u = await db.Users.FindAsync([userId], ct) ?? throw new KeyNotFoundException();
        return new CoinBalanceDto(u.Coins);
    }

    public async Task<bool> DeductAsync(Guid userId, int amount, string description, CancellationToken ct = default)
    {
        var u = await db.Users.FindAsync([userId], ct) ?? throw new KeyNotFoundException();
        if (u.Coins < amount) return false;

        u.Coins -= amount;
        db.CoinTransactions.Add(new CoinTransaction
        {
            UserId      = userId,
            Amount      = -amount,
            Type        = CoinTransactionType.Deduction,
            Description = description
        });
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task AddAsync(Guid userId, int amount, CoinTransactionType type, string? desc = null, CancellationToken ct = default)
    {
        var u = await db.Users.FindAsync([userId], ct) ?? throw new KeyNotFoundException();
        u.Coins += amount;
        db.CoinTransactions.Add(new CoinTransaction
        {
            UserId      = userId,
            Amount      = amount,
            Type        = type,
            Description = desc
        });
        await db.SaveChangesAsync(ct);
    }
}

// ─── VipService ───────────────────────────────────────────────────────────────
public class VipService(AppDbContext db, CoinService coins)
{
    public async Task<List<VipPlanDto>> GetPlansAsync(CancellationToken ct = default) =>
        await db.VipPlans
            .Where(p => p.IsActive)
            .Select(p => new VipPlanDto(p.Id, p.Name, p.Price,
                p.Period.ToString(), p.DurationDays, p.Features, p.IsBest, p.BonusCoins))
            .ToListAsync(ct);

    public async Task<VipStatusDto> GetStatusAsync(Guid userId, CancellationToken ct = default)
    {
        var u = await db.Users.FindAsync([userId], ct) ?? throw new KeyNotFoundException();
        return new VipStatusDto(u.IsVip, u.VipExpiresAt);
    }

    public async Task SubscribeAsync(Guid userId, Guid planId, CancellationToken ct = default)
    {
        var plan = await db.VipPlans.FindAsync([planId], ct) ?? throw new KeyNotFoundException("الخطة غير موجودة");
        var user = await db.Users.FindAsync([userId], ct)    ?? throw new KeyNotFoundException();

        var now    = DateTime.UtcNow;
        var expiry = (user.IsVip && user.VipExpiresAt > now)
            ? user.VipExpiresAt.Value.AddDays(plan.DurationDays)
            : now.AddDays(plan.DurationDays);

        user.IsVip       = true;
        user.VipExpiresAt = expiry;

        db.VipSubscriptions.Add(new VipSubscription
        {
            UserId    = userId,
            PlanId    = planId,
            StartedAt = now,
            ExpiresAt = expiry,
            PricePaid = plan.Price
        });

        // Bonus coins for subscription
        if (plan.BonusCoins > 0)
            await coins.AddAsync(userId, plan.BonusCoins, CoinTransactionType.VipReward, $"مكافأة اشتراك {plan.Name}", ct);

        await db.SaveChangesAsync(ct);
    }
}
