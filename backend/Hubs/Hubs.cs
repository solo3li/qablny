using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Qablny.DTOs;
using Qablny.Services;
using System.Security.Claims;
using Qablny.Enums;

using Qablny.Data;
using System.Collections.Concurrent;

namespace Qablny.Hubs;

/// <summary>Real-time chat: send messages, typing indicator, read receipts</summary>
[Authorize]
public class ChatHub(MessageService messages, PresenceService presence, AppDbContext db, PushNotificationService pushNotification) : Hub
{
    private static readonly ConcurrentDictionary<string, DateTime> _activeCalls = new();
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

    // ─── Direct Calling Signaling ─────────────────────────────────────────────

    public async Task InitiateCall(Guid friendId, string callType)
    {
        var callerId = CurrentUserId();
        var roomName = $"call_{callerId}_{friendId}_{Guid.NewGuid()}";
        
        // Notify the target user via SignalR
        await Clients.User(friendId.ToString()).SendAsync("IncomingCall", new {
            CallerId = callerId,
            RoomName = roomName,
            CallType = callType
        });

        // Send Push Notification
        var receiver = await db.Users.FindAsync(friendId);
        var sender = await db.Users.FindAsync(callerId);
        if (receiver?.ExpoPushToken != null && sender != null)
        {
            var callTypeText = callType == "video" ? "فيديو" : "صوتية";
            await pushNotification.SendPushAsync(
                receiver.ExpoPushToken,
                $"مكالمة واردة من {sender.Name}",
                $"مكالمة {callTypeText} واردة الآن...",
                new { type = "call", callerId, roomName, callType }
            );
        }
    }

    public async Task AcceptCall(Guid callerId, string roomName)
    {
        var friendId = CurrentUserId();
        _activeCalls[roomName] = DateTime.UtcNow;

        await Clients.User(callerId.ToString()).SendAsync("CallAccepted", new {
            FriendId = friendId,
            RoomName = roomName
        });
    }

    public async Task DeclineCall(Guid callerId)
    {
        var friendId = CurrentUserId();
        await Clients.User(callerId.ToString()).SendAsync("CallDeclined", friendId);
    }

    public async Task EndCall(Guid friendId, string roomName, string callType)
    {
        var callerId = CurrentUserId();
        await Clients.User(friendId.ToString()).SendAsync("CallEnded", callerId);

        // Calculate duration
        int durationSeconds = 0;
        var msgType = MessageType.MissedCall;

        if (_activeCalls.TryRemove(roomName, out var startTime))
        {
            durationSeconds = (int)(DateTime.UtcNow - startTime).TotalSeconds;
            msgType = callType == "video" ? MessageType.VideoCall : MessageType.VoiceCall;
        }

        // Save Call Log Message
        var msg = await messages.SendAsync(callerId, friendId, new SendMessageRequest(
            msgType,
            Content: callType == "video" ? "مكالمة فيديو" : "مكالمة صوتية",
            DurationSeconds: durationSeconds
        ));

        // Broadcast Call Log to both users so it appears in Chat instantly
        await Clients.User(friendId.ToString()).SendAsync("ReceiveMessage", msg);
        await Clients.Caller.SendAsync("ReceiveMessage", msg);
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
