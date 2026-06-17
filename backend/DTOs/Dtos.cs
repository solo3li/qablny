using Qablny.Enums;

namespace Qablny.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────
public record RegisterRequest(string Email, string Password, string Name, int Age, Gender Gender, string? Location);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserDto User);

// ── User ──────────────────────────────────────────────────────────────────────
public record UserDto(Guid Id, string Name, string? Bio, string? ProfileImageUrl,
    int Age, Gender Gender, string? Location, List<string> Interests,
    int Coins, bool IsVip, bool IsOnline, DateTime LastSeen, DateTime JoinedAt, int TotalMatches);

public record UpdateProfileRequest(string? Name, string? Bio, string? Location, List<string>? Interests, int? Age);

// ── Friend ────────────────────────────────────────────────────────────────────
public record FriendDto(Guid Id, string Name, string? ProfileImageUrl, Gender Gender,
    string? Location, int Age, bool IsOnline, string LastSeen, int UnreadCount, string? LastMessage);

// ── Message ───────────────────────────────────────────────────────────────────
public record MessageDto(Guid Id, Guid ConversationId, Guid SenderId, Guid ReceiverId,
    MessageType Type, string? Content, string? Translation, int? DurationSeconds,
    string? MediaUrl, string? LocationName, double? LocationLat, double? LocationLng,
    bool IsRead, DateTime CreatedAt, bool IsMe);

public record SendMessageRequest(MessageType Type, string? Content = null,
    int? DurationSeconds = null, string? MediaUrl = null,
    string? LocationName = null, double? LocationLat = null, double? LocationLng = null);

public record ConversationDto(Guid Id, FriendDto Friend, MessageDto? LastMessage, int UnreadCount);

// ── Match ─────────────────────────────────────────────────────────────────────
public record JoinQueueRequest(Gender? PreferredGender = null, string? PreferredRegion = null, int MinAge = 18, int MaxAge = 60);
public record MatchFoundDto(string RoomName, string LiveKitToken, string LiveKitServerUrl, MatchedUserDto MatchedUser);
public record MatchedUserDto(Guid Id, string Name, string? ProfileImageUrl, int Age, string? Location, Gender Gender, List<string> Interests, bool IsVip);
public record LiveKitTokenDto(string Token, string RoomName, string ServerUrl);

// ── Gift / Coin / VIP ─────────────────────────────────────────────────────────
public record GiftDto(Guid Id, string Name, string Emoji, int CoinCost);
public record SendGiftRequest(Guid GiftId, Guid ReceiverId);
public record CoinBalanceDto(int Balance);
public record CoinTransactionDto(Guid Id, int Amount, CoinTransactionType Type, string? Description, DateTime CreatedAt);
public record PurchaseCoinsRequest(int Amount);  // mock — no real payment
public record VipPlanDto(Guid Id, string Name, decimal Price, string Period, int DurationDays, List<string> Features, bool IsBest, int BonusCoins);
public record VipStatusDto(bool IsVip, DateTime? ExpiresAt);

// ── Moderation ────────────────────────────────────────────────────────────────
public record ReportRequest(string Reason);
public record BlockedUserDto(Guid Id, string Name, string? ProfileImageUrl);

// ── Common ────────────────────────────────────────────────────────────────────
public record ErrorResponse(string Message, string? Detail = null);
public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize);
