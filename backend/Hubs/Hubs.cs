using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Qablny.DTOs;
using Qablny.Services;
using System.Security.Claims;

namespace Qablny.Hubs;

/// <summary>Real-time chat: send messages, typing indicator, read receipts</summary>
[Authorize]
public class ChatHub(MessageService messages, PresenceService presence) : Hub
{
    public override async Task OnConnectedAsync()
    {
        await presence.SetOnlineAsync(CurrentUserId());
        await Clients.Others.SendAsync("UserOnline", CurrentUserId());
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? ex)
    {
        await presence.SetOfflineAsync(CurrentUserId());
        await Clients.Others.SendAsync("UserOffline", CurrentUserId());
        await base.OnDisconnectedAsync(ex);
    }

    /// <summary>Send a real-time message to a friend</summary>
    public async Task SendMessage(Guid friendId, SendMessageRequest request)
    {
        var senderId = CurrentUserId();
        var msg = await messages.SendAsync(senderId, friendId, request);

        // Send to receiver (if connected)
        await Clients.User(friendId.ToString()).SendAsync("ReceiveMessage", msg);
        // Confirm to sender
        await Clients.Caller.SendAsync("MessageSent", msg);
    }

    public async Task StartTyping(Guid friendId)
    {
        await Clients.User(friendId.ToString()).SendAsync("TypingStarted", CurrentUserId());
    }

    public async Task StopTyping(Guid friendId)
    {
        await Clients.User(friendId.ToString()).SendAsync("TypingStopped", CurrentUserId());
    }

    public async Task MarkRead(Guid friendId)
    {
        var userId = CurrentUserId();
        await messages.MarkReadAsync(userId, friendId);
        await Clients.User(friendId.ToString()).SendAsync("MessagesRead", userId);
    }

    public async Task Heartbeat()
    {
        await presence.RefreshAsync(CurrentUserId());
    }

    private Guid CurrentUserId() =>
        Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

/// <summary>Match hub: join queue, skip, leave</summary>
[Authorize]
public class MatchHub(MatchService matchService) : Hub
{
    public async Task JoinQueue(JoinQueueRequest filters)
    {
        var userId = CurrentUserId();
        await matchService.JoinQueueAsync(userId, Context.ConnectionId, filters);
        await Clients.Caller.SendAsync("QueueJoined");
    }

    public async Task Skip()
    {
        await matchService.SkipAsync(CurrentUserId());
    }

    public async Task LeaveQueue()
    {
        await matchService.LeaveQueueAsync(CurrentUserId());
        await Clients.Caller.SendAsync("QueueLeft");
    }

    public override async Task OnDisconnectedAsync(Exception? ex)
    {
        await matchService.LeaveQueueAsync(CurrentUserId());
        await base.OnDisconnectedAsync(ex);
    }

    private Guid CurrentUserId() =>
        Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

/// <summary>Notification hub: friend requests, gifts, system messages</summary>
[Authorize]
public class NotificationHub : Hub
{
    // Server pushes to clients; no client-to-server calls needed here.
    // Use IHubContext<NotificationHub> from services to push notifications.
}
