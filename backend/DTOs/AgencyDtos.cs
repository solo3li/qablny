namespace Qablny.DTOs;

public record AgencyLoginRequest(string Username, string Password);

public record AgencyAuthResponse(
    string Token,
    Guid AgencyId,
    string AgencyName,
    string ManagerName,
    string InviteCode
);

public record AgencyDashboardDto(
    string AgencyName,
    int ActiveHosts,
    int TotalHosts,
    int TotalEarnings,
    int AgencyCut,
    int MonthlyTarget,
    int CurrentProgress
);

public record AgencyHostDto(
    Guid Id,
    string Name,
    string Status,
    int Earnings,
    int Matches,
    string JoinedDate
);

public record AgencyTransactionDto(
    Guid Id,
    string Type,
    string HostName,
    int Amount,
    string Date
);

public record SendAnnouncementRequest(string Message);

public record PayoutRequestDto(
    Guid Id,
    decimal Amount,
    string Status,
    string? AdminNote,
    DateTime CreatedAt,
    DateTime? ProcessedAt
);

public record CreatePayoutRequest(decimal Amount);
