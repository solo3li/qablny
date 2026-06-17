using Microsoft.AspNetCore.SignalR;
using Qablny.Data;
using Qablny.DTOs;
using Qablny.Entities;
using Qablny.Enums;
using Qablny.Hubs;
using StackExchange.Redis;
using Microsoft.EntityFrameworkCore;

namespace Qablny.Services;

/// <summary>
/// Manages the random-matching queue using Redis lists.
/// Users join a gender-filtered or global queue.
/// Background service polls every 300ms to pair users.
/// </summary>
public class MatchService(
    IConnectionMultiplexer redis,
    LiveKitService liveKit,
    IHubContext<MatchHub> matchHub,
    IServiceScopeFactory scopeFactory,
    ILogger<MatchService> logger)
{
    // Queue keys
    private const string QueueAll    = "match:queue:all";
    private const string QueueMale   = "match:queue:male";
    private const string QueueFemale = "match:queue:female";
    private static string FiltersKey(Guid id)   => $"match:filters:{id}";
    private static string ActiveKey(Guid id)    => $"match:active:{id}";
    private static string ConnKey(Guid id)      => $"match:connId:{id}";

    public async Task JoinQueueAsync(Guid userId, string connId, JoinQueueRequest filters, CancellationToken ct = default)
    {
        var rd = redis.GetDatabase();

        // Store filters + connection
        await rd.StringSetAsync(FiltersKey(userId), System.Text.Json.JsonSerializer.Serialize(filters), TimeSpan.FromMinutes(10));
        await rd.StringSetAsync(ConnKey(userId), connId, TimeSpan.FromMinutes(10));

        // Push to queue
        var queueKey = filters.PreferredGender switch
        {
            Gender.Male   => QueueMale,
            Gender.Female => QueueFemale,
            _             => QueueAll
        };
        await rd.ListRightPushAsync(queueKey, userId.ToString());
    }

    public async Task LeaveQueueAsync(Guid userId)
    {
        var rd = redis.GetDatabase();
        await RemoveFromAllQueues(rd, userId.ToString());
        await rd.KeyDeleteAsync([FiltersKey(userId), ConnKey(userId), ActiveKey(userId)]);
    }

    public async Task SkipAsync(Guid userId)
    {
        var rd = redis.GetDatabase();

        // End active room if any
        var roomName = await rd.StringGetAsync(ActiveKey(userId));
        if (!roomName.IsNullOrEmpty)
        {
            await rd.KeyDeleteAsync(ActiveKey(userId));
            await matchHub.Clients.Group(roomName!).SendAsync("MatchSkipped");
        }

        // Re-join queue
        await rd.ListRightPushAsync(QueueAll, userId.ToString());
    }

    /// <summary>Called by MatchingBackgroundService every 300ms</summary>
    public async Task TryMatchAsync()
    {
        var rd = redis.GetDatabase();

        // Try gender-specific queues first, then global
        await TryMatchFromQueue(rd, QueueMale);
        await TryMatchFromQueue(rd, QueueFemale);
        await TryMatchFromQueue(rd, QueueAll);
    }

    private async Task TryMatchFromQueue(IDatabase rd, string queueKey)
    {
        // Need at least 2 users
        var len = await rd.ListLengthAsync(queueKey);
        if (len < 2) return;

        var a = await rd.ListLeftPopAsync(queueKey);
        var b = await rd.ListLeftPopAsync(queueKey);

        if (a.IsNullOrEmpty || b.IsNullOrEmpty)
        {
            if (!a.IsNullOrEmpty) await rd.ListLeftPushAsync(queueKey, a);
            if (!b.IsNullOrEmpty) await rd.ListLeftPushAsync(queueKey, b);
            return;
        }

        var userAId = Guid.Parse(a.ToString());
        var userBId = Guid.Parse(b.ToString());

        // Check they're not blocked
        using var scope = scopeFactory.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var moderation  = scope.ServiceProvider.GetRequiredService<ModerationService>();

        if (await moderation.IsBlockedAsync(userAId, userBId))
        {
            await rd.ListRightPushAsync(queueKey, a);
            await rd.ListRightPushAsync(queueKey, b);
            return;
        }

        // Create LiveKit room + tokens
        var room   = liveKit.NewRoomName();
        var userA  = await db.Users.FindAsync([userAId]);
        var userB  = await db.Users.FindAsync([userBId]);

        if (userA is null || userB is null)
        {
            if (userA is not null) await rd.ListRightPushAsync(queueKey, a);
            if (userB is not null) await rd.ListRightPushAsync(queueKey, b);
            return;
        }

        var tokenA = liveKit.GenerateToken(userAId, userA.Name, room);
        var tokenB = liveKit.GenerateToken(userBId, userB.Name, room);

        // Save active sessions
        await rd.StringSetAsync(ActiveKey(userAId), room, TimeSpan.FromHours(1));
        await rd.StringSetAsync(ActiveKey(userBId), room, TimeSpan.FromHours(1));

        // Save match to DB
        db.MatchSessions.Add(new MatchSession { User1Id = userAId, User2Id = userBId, LiveKitRoomName = room });
        userA.TotalMatches++;
        userB.TotalMatches++;
        await db.SaveChangesAsync();

        // Notify via SignalR
        var connA = await rd.StringGetAsync(ConnKey(userAId));
        var connB = await rd.StringGetAsync(ConnKey(userBId));

        var matchA = new MatchFoundDto(room, tokenA, liveKit.ServerUrl, ToMatchDto(userB));
        var matchB = new MatchFoundDto(room, tokenB, liveKit.ServerUrl, ToMatchDto(userA));

        await matchHub.Clients.Client(connA!).SendAsync("MatchFound", matchA);
        await matchHub.Clients.Client(connB!).SendAsync("MatchFound", matchB);

        logger.LogInformation("Matched {A} ↔ {B} in room {Room}", userA.Name, userB.Name, room);
    }

    private async Task RemoveFromAllQueues(IDatabase rd, string userId)
    {
        foreach (var q in new[] { QueueAll, QueueMale, QueueFemale })
            await rd.ListRemoveAsync(q, userId);
    }

    private static MatchedUserDto ToMatchDto(Entities.User u) =>
        new(u.Id, u.Name, u.ProfileImageUrl, u.Age, u.Location, u.Gender, u.Interests, u.IsVip);
}

// ─── Background Service ───────────────────────────────────────────────────────
public class MatchingBackgroundService(IServiceScopeFactory scopeFactory, ILogger<MatchingBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Matching service started");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var svc = scope.ServiceProvider.GetRequiredService<MatchService>();
                await svc.TryMatchAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in matching loop");
            }
            await Task.Delay(300, stoppingToken);
        }
    }
}
