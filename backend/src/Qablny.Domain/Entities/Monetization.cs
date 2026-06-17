using Qablny.Domain.Enums;

namespace Qablny.Domain.Entities;

public class Gift
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = default!;
    public string Emoji { get; set; } = default!;
    public int CoinCost { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<GiftTransaction> Transactions { get; set; } = [];
}

public class GiftTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SenderId { get; set; }
    public Guid ReceiverId { get; set; }
    public Guid GiftId { get; set; }
    public int CoinsSpent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User Sender { get; set; } = default!;
    public User Receiver { get; set; } = default!;
    public Gift Gift { get; set; } = default!;
}

public class CoinTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public int Amount { get; set; } // positive = credit, negative = debit
    public CoinTransactionType Type { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = default!;
}

public class VipPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = default!;
    public decimal Price { get; set; }
    public VipPeriod Period { get; set; }
    public int DurationDays { get; set; }
    public List<string> Features { get; set; } = [];
    public bool IsBest { get; set; }
    public int BonusCoins { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<VipSubscription> Subscriptions { get; set; } = [];
}

public class VipSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid PlanId { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public decimal PricePaid { get; set; }

    public User User { get; set; } = default!;
    public VipPlan Plan { get; set; } = default!;
}
