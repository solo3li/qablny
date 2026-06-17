using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Qablny.DTOs;
using Qablny.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace Qablny.Controllers;

// ─── Base ─────────────────────────────────────────────────────────────────────
[ApiController]
public abstract class BaseController : ControllerBase
{
    protected Guid UserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
[Route("api/auth")]
public class AuthController(AuthService auth) : BaseController
{
    [HttpPost("register")]
    public async Task<AuthResponse> Register(RegisterRequest req) =>
        await auth.RegisterAsync(req);

    [HttpPost("login")]
    public async Task<AuthResponse> Login(LoginRequest req) =>
        await auth.LoginAsync(req);

    [HttpPost("refresh")]
    public async Task<AuthResponse> Refresh(RefreshRequest req) =>
        await auth.RefreshAsync(req.RefreshToken);

    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout(RefreshRequest req)
    {
        await auth.RevokeAsync(req.RefreshToken);
        return Ok();
    }
}

// ─── Users ────────────────────────────────────────────────────────────────────
[Route("api/users"), Authorize]
public class UsersController(UserService users) : BaseController
{
    [HttpGet("me")]
    public async Task<UserDto> GetMe() => await users.GetAsync(UserId);

    [HttpPut("me")]
    public async Task<UserDto> UpdateMe(UpdateProfileRequest req) =>
        await users.UpdateAsync(UserId, req);

    [HttpPut("me/image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        var url = await users.UploadImageAsync(UserId, stream, file.ContentType);
        return Ok(new { url });
    }

    public record PushTokenRequest(string Token);

    [HttpPut("me/push-token")]
    public async Task<IActionResult> UpdatePushToken([FromBody] PushTokenRequest req)
    {
        await users.UpdatePushTokenAsync(UserId, req.Token);
        return Ok();
    }

    [HttpGet("{id:guid}")]
    public async Task<UserDto> GetUser(Guid id) => await users.GetAsync(id);

    [HttpDelete("me")]
    public async Task<IActionResult> Delete()
    {
        await users.DeleteAsync(UserId);
        return NoContent();
    }
}

// ─── Friends ──────────────────────────────────────────────────────────────────
[Route("api/friends"), Authorize]
public class FriendsController(FriendService friends) : BaseController
{
    [HttpGet]
    public async Task<List<FriendDto>> GetFriends() =>
        await friends.GetFriendsAsync(UserId);

    [HttpGet("requests")]
    public async Task<List<FriendDto>> GetRequests() =>
        await friends.GetPendingAsync(UserId);

    [HttpPost("request/{userId:guid}")]
    public async Task<IActionResult> SendRequest(Guid userId)
    {
        await friends.SendRequestAsync(UserId, userId);
        return Ok();
    }

    [HttpPut("accept/{userId:guid}")]
    public async Task<IActionResult> Accept(Guid userId)
    {
        await friends.AcceptAsync(UserId, userId);
        return Ok();
    }

    [HttpPut("decline/{userId:guid}")]
    public async Task<IActionResult> Decline(Guid userId)
    {
        await friends.DeclineAsync(UserId, userId);
        return Ok();
    }

    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> Remove(Guid userId)
    {
        await friends.RemoveAsync(UserId, userId);
        return NoContent();
    }
}

// ─── Messages ─────────────────────────────────────────────────────────────────
[Route("api/conversations"), Authorize]
public class MessagesController(MessageService messages, MinioStorageService minio, Microsoft.AspNetCore.SignalR.IHubContext<Qablny.Hubs.ChatHub> chatHub) : BaseController
{
    [HttpGet]
    public async Task<List<ConversationDto>> GetConversations() =>
        await messages.GetConversationsAsync(UserId);

    [HttpGet("{friendId:guid}/messages")]
    public async Task<List<MessageDto>> GetMessages(Guid friendId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) =>
        await messages.GetMessagesAsync(UserId, friendId, page, pageSize);

    [HttpPost("{friendId:guid}/messages")]
    public async Task<MessageDto> SendMessage(Guid friendId, SendMessageRequest req)
    {
        var msg = await messages.SendAsync(UserId, friendId, req);
        await chatHub.Clients.User(friendId.ToString()).SendAsync("ReceiveMessage", msg);
        return msg;
    }

    [HttpPut("{friendId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid friendId)
    {
        await messages.MarkReadAsync(UserId, friendId);
        return Ok();
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadMedia(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        // Generate a random object name or use user id folder
        var ext = Path.GetExtension(file.FileName);
        var objectName = $"chat/{UserId}/{Guid.NewGuid()}{ext}";
        var url = await minio.UploadAsync(stream, objectName, file.ContentType, "qablny-media");
        return Ok(new { url });
    }
}

// ─── Match ────────────────────────────────────────────────────────────────────
[Route("api/match"), Authorize]
public class MatchController(LiveKitService liveKit) : BaseController
{
    /// <summary>Get LiveKit token for a specific room (direct calls)</summary>
    [HttpGet("token/{roomName}")]
    public IActionResult GetToken(string roomName)
    {
        var name  = User.FindFirstValue("name") ?? "User";
        var token = liveKit.GenerateToken(UserId, name, roomName);
        return Ok(new LiveKitTokenDto(token, roomName, liveKit.ServerUrl));
    }
}

// ─── Gifts ────────────────────────────────────────────────────────────────────
[Route("api/gifts"), Authorize]
public class GiftsController(GiftService gifts, IHubContext<Qablny.Hubs.ChatHub> chatHub) : BaseController
{
    [HttpGet, AllowAnonymous]
    public async Task<List<GiftDto>> GetGifts() => await gifts.GetGiftsAsync();

    [HttpPost("send")]
    public async Task<GiftDto> SendGift(SendGiftRequest req)
    {
        var gift = await gifts.SendGiftAsync(UserId, req);
        var senderName = User.FindFirstValue("name") ?? "مستخدم";
        await chatHub.Clients.User(req.ReceiverId.ToString()).SendAsync("ReceiveGift", new { 
            senderId = UserId, 
            senderName,
            gift 
        });
        return gift;
    }
}

// ─── Coins ────────────────────────────────────────────────────────────────────
[Route("api/coins"), Authorize]
public class CoinsController(CoinService coins) : BaseController
{
    [HttpGet("balance")]
    public async Task<CoinBalanceDto> GetBalance() => await coins.GetBalanceAsync(UserId);

    [HttpGet("transactions")]
    public async Task<List<CoinTransactionDto>> GetTransactions([FromQuery] int page = 1) =>
        await coins.GetTransactionsAsync(UserId, page);

    [HttpPost("purchase")]
    public async Task<CoinBalanceDto> Purchase(PurchaseCoinsRequest req) =>
        await coins.PurchaseAsync(UserId, req);
}

// ─── VIP ──────────────────────────────────────────────────────────────────────
[Route("api/vip"), Authorize]
public class VipController(VipService vip) : BaseController
{
    [HttpGet("plans"), AllowAnonymous]
    public async Task<List<VipPlanDto>> GetPlans() => await vip.GetPlansAsync();

    [HttpGet("status")]
    public async Task<VipStatusDto> GetStatus() => await vip.GetStatusAsync(UserId);

    [HttpPost("subscribe/{planId:guid}")]
    public async Task<IActionResult> Subscribe(Guid planId)
    {
        await vip.SubscribeAsync(UserId, planId);
        return Ok();
    }
}

// ─── Moderation ───────────────────────────────────────────────────────────────
[Route("api/moderation"), Authorize]
public class ModerationController(ModerationService moderation) : BaseController
{
    [HttpPost("report/{userId:guid}")]
    public async Task<IActionResult> Report(Guid userId, ReportRequest req)
    {
        await moderation.ReportAsync(UserId, userId, req);
        return Ok();
    }

    [HttpPost("block/{userId:guid}")]
    public async Task<IActionResult> Block(Guid userId)
    {
        await moderation.BlockAsync(UserId, userId);
        return Ok();
    }

    [HttpDelete("block/{userId:guid}")]
    public async Task<IActionResult> Unblock(Guid userId)
    {
        await moderation.UnblockAsync(UserId, userId);
        return Ok();
    }

    [HttpGet("blocked")]
    public async Task<List<BlockedUserDto>> GetBlocked() =>
        await moderation.GetBlockedAsync(UserId);
}
