using Qablny.Domain.Enums;

namespace Qablny.Domain.Entities;

public class MatchSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid User1Id { get; set; }
    public Guid User2Id { get; set; }
    public string LiveKitRoomName { get; set; } = default!;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }
    public Guid? SkippedByUserId { get; set; }

    public User User1 { get; set; } = default!;
    public User User2 { get; set; } = default!;
}

public class Report
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ReporterId { get; set; }
    public Guid ReportedUserId { get; set; }
    public string Reason { get; set; } = default!;
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    public string? AdminNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Reporter { get; set; } = default!;
    public User ReportedUser { get; set; } = default!;
}

public class UserBlock
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BlockerId { get; set; }
    public Guid BlockedUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User Blocker { get; set; } = default!;
    public User BlockedUser { get; set; } = default!;
}

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Token { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = default!;
}
