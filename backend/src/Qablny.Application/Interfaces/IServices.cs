using Qablny.Application.DTOs;
using Qablny.Domain.Entities;

namespace Qablny.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);
    Task RevokeTokenAsync(string refreshToken, CancellationToken ct = default);
}

public interface IUserService
{
    Task<UserDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default);
    Task<string> UploadProfileImageAsync(Guid userId, Stream imageStream, string contentType, CancellationToken ct = default);
    Task DeleteAccountAsync(Guid userId, CancellationToken ct = default);
}

public interface IFriendService
{
    Task<List<FriendDto>> GetFriendsAsync(Guid userId, CancellationToken ct = default);
    Task<List<FriendDto>> GetPendingRequestsAsync(Guid userId, CancellationToken ct = default);
    Task SendFriendRequestAsync(Guid requesterId, Guid addresseeId, CancellationToken ct = default);
    Task AcceptFriendRequestAsync(Guid userId, Guid requesterId, CancellationToken ct = default);
    Task DeclineFriendRequestAsync(Guid userId, Guid requesterId, CancellationToken ct = default);
    Task RemoveFriendAsync(Guid userId, Guid friendId, CancellationToken ct = default);
    Task<bool> AreFriendsAsync(Guid user1Id, Guid user2Id, CancellationToken ct = default);
}

public interface IMessageService
{
    Task<List<ConversationDto>> GetConversationsAsync(Guid userId, CancellationToken ct = default);
    Task<List<MessageDto>> GetMessagesAsync(Guid userId, Guid friendId, int page = 1, int pageSize = 50, CancellationToken ct = default);
    Task<MessageDto> SendMessageAsync(Guid senderId, Guid receiverId, SendMessageRequest request, CancellationToken ct = default);
    Task MarkReadAsync(Guid userId, Guid friendId, CancellationToken ct = default);
    Task<string?> TranslateMessageAsync(string text, string targetLang = "en", CancellationToken ct = default);
}

public interface IMatchService
{
    Task<bool> JoinQueueAsync(Guid userId, MatchFilters filters, CancellationToken ct = default);
    Task SkipMatchAsync(Guid userId, CancellationToken ct = default);
    Task LeaveQueueAsync(Guid userId, CancellationToken ct = default);
    Task<int> GetQueuePositionAsync(Guid userId, CancellationToken ct = default);
}

public interface ILiveKitService
{
    Task<string> CreateRoomAsync(string roomName, CancellationToken ct = default);
    Task<string> GenerateTokenAsync(Guid userId, string userName, string roomName, bool canPublish = true, CancellationToken ct = default);
    Task EndRoomAsync(string roomName, CancellationToken ct = default);
    string GenerateRoomName();
}

public interface IGiftService
{
    Task<List<GiftDto>> GetGiftsAsync(CancellationToken ct = default);
    Task<GiftDto> SendGiftAsync(Guid senderId, SendGiftRequest request, CancellationToken ct = default);
}

public interface ICoinService
{
    Task<CoinBalanceDto> GetBalanceAsync(Guid userId, CancellationToken ct = default);
    Task<List<CoinTransactionDto>> GetTransactionsAsync(Guid userId, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<CoinBalanceDto> PurchaseCoinsAsync(Guid userId, PurchaseCoinsRequest request, CancellationToken ct = default);
    Task<bool> DeductCoinsAsync(Guid userId, int amount, string description, CancellationToken ct = default);
    Task AddCoinsAsync(Guid userId, int amount, Domain.Enums.CoinTransactionType type, string? description = null, CancellationToken ct = default);
}

public interface IVipService
{
    Task<List<VipPlanDto>> GetPlansAsync(CancellationToken ct = default);
    Task<VipStatusDto> GetStatusAsync(Guid userId, CancellationToken ct = default);
    Task SubscribeAsync(Guid userId, Guid planId, CancellationToken ct = default);
}

public interface IModerationService
{
    Task ReportUserAsync(Guid reporterId, Guid reportedId, ReportRequest request, CancellationToken ct = default);
    Task BlockUserAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default);
    Task UnblockUserAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default);
    Task<List<BlockedUserDto>> GetBlockedUsersAsync(Guid userId, CancellationToken ct = default);
    Task<bool> IsBlockedAsync(Guid user1Id, Guid user2Id, CancellationToken ct = default);
}

public interface IPresenceService
{
    Task SetOnlineAsync(Guid userId, CancellationToken ct = default);
    Task SetOfflineAsync(Guid userId, CancellationToken ct = default);
    Task<bool> IsOnlineAsync(Guid userId, CancellationToken ct = default);
    Task RefreshPresenceAsync(Guid userId, CancellationToken ct = default);
}

public interface IFileStorageService
{
    Task<string> UploadAsync(Stream stream, string fileName, string contentType, string bucket = "qablny", CancellationToken ct = default);
    Task DeleteAsync(string fileName, string bucket = "qablny", CancellationToken ct = default);
    string GetPublicUrl(string fileName, string bucket = "qablny");
}
