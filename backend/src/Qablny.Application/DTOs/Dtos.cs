using Qablny.Domain.Enums;

namespace Qablny.Application.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────
public record RegisterRequest(
    string Email,
    string Password,
    string Name,
    int Age,
    Gender Gender,
    string? Location
);

public record LoginRequest(string Email, string Password);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record RefreshRequest(string RefreshToken);

// ── User ──────────────────────────────────────────────────────────────────────
public record UserDto(
    Guid Id,
    string Name,
    string? Bio,
    string? ProfileImageUrl,
    int Age,
    Gender Gender,
    string? Location,
    List<string> Interests,
    int Coins,
    bool IsVip,
    bool IsOnline,
    DateTime LastSeen,
    DateTime JoinedAt,
    int TotalMatches
);

public record UpdateProfileRequest(
    string? Name,
    string? Bio,
    string? Location,
    List<string>? Interests,
    int? Age
);

// ── Friend ────────────────────────────────────────────────────────────────────
public record FriendDto(
    Guid Id,
    string Name,
    string? ProfileImageUrl,
    Gender Gender,
    string? Location,
    int Age,
    bool IsOnline,
    string LastSeen,
    int UnreadCount,
    string? LastMessage
);

// ── Message ───────────────────────────────────────────────────────────────────
public record MessageDto(
    Guid Id,
    Guid ConversationId,
    Guid SenderId,
    Guid ReceiverId,
    MessageType Type,
    string? Content,
    string? Translation,
    int? DurationSeconds,
    string? MediaUrl,
    string? LocationName,
    double? LocationLat,
    double? LocationLng,
    bool IsRead,
    DateTime CreatedAt,
    bool IsMe
);

public record SendMessageRequest(
    MessageType Type,
    string? Content,
    int? DurationSeconds,
    string? MediaUrl,
    string? LocationName,
    double? LocationLat,
    double? LocationLng
);

// ── Match ─────────────────────────────────────────────────────────────────────
public record MatchFilters(
    Gender? PreferredGender,
    string? PreferredRegion,
    int? MinAge,
    int? MaxAge
);

public record MatchFoundDto(
    string RoomName,
    string LiveKitToken,
    MatchedUserDto MatchedUser
);

public record MatchedUserDto(
    Guid Id,
    string Name,
    string? ProfileImageUrl,
    int Age,
    string? Location,
    Gender Gender,
    List<string> Interests,
    bool IsVip
);

// ── Gift ──────────────────────────────────────────────────────────────────────
public record GiftDto(
    Guid Id,
    string Name,
    string Emoji,
    int CoinCost
);

public record SendGiftRequest(Guid GiftId, Guid ReceiverId);

// ── Coins ─────────────────────────────────────────────────────────────────────
public record CoinBalanceDto(int Balance);

public record CoinTransactionDto(
    Guid Id,
    int Amount,
    CoinTransactionType Type,
    string? Description,
    DateTime CreatedAt
);

public record PurchaseCoinsRequest(int Amount); // mock — no real payment

// ── VIP ───────────────────────────────────────────────────────────────────────
public record VipPlanDto(
    Guid Id,
    string Name,
    decimal Price,
    string Period,
    int DurationDays,
    List<string> Features,
    bool IsBest,
    int BonusCoins
);

public record VipStatusDto(
    bool IsVip,
    DateTime? ExpiresAt
);

// ── Report / Block ────────────────────────────────────────────────────────────
public record ReportRequest(string Reason);

public record BlockedUserDto(
    Guid Id,
    string Name,
    string? ProfileImageUrl
);

// ── LiveKit ───────────────────────────────────────────────────────────────────
public record LiveKitTokenDto(string Token, string RoomName, string ServerUrl);

// ── Conversation ──────────────────────────────────────────────────────────────
public record ConversationDto(
    Guid Id,
    FriendDto Friend,
    MessageDto? LastMessage,
    int UnreadCount
);
