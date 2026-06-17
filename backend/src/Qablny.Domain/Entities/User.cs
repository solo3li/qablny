using Qablny.Domain.Enums;

namespace Qablny.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
    public int Age { get; set; }
    public Gender Gender { get; set; }
    public string? Location { get; set; }
    public List<string> Interests { get; set; } = [];
    public int Coins { get; set; } = 100; // initial coins
    public bool IsVip { get; set; }
    public DateTime? VipExpiresAt { get; set; }
    public bool IsOnline { get; set; }
    public DateTime LastSeen { get; set; } = DateTime.UtcNow;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public int TotalMatches { get; set; }
    public bool IsBlocked { get; set; }
    public bool IsEmailVerified { get; set; }

    // Navigation
    public ICollection<Friendship> SentFriendRequests { get; set; } = [];
    public ICollection<Friendship> ReceivedFriendRequests { get; set; } = [];
    public ICollection<Message> SentMessages { get; set; } = [];
    public ICollection<GiftTransaction> SentGifts { get; set; } = [];
    public ICollection<GiftTransaction> ReceivedGifts { get; set; } = [];
    public ICollection<CoinTransaction> CoinTransactions { get; set; } = [];
    public ICollection<VipSubscription> VipSubscriptions { get; set; } = [];
    public ICollection<Report> FiledReports { get; set; } = [];
    public ICollection<Report> ReceivedReports { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
