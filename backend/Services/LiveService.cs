using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.DTOs;
using Qablny.Entities;

namespace Qablny.Services;

public class LiveService(AppDbContext db, LiveKitService liveKit)
{
    public async Task<List<LiveRoomDto>> GetActiveRoomsAsync()
    {
        return await db.LiveRooms
            .Include(r => r.Host)
            .Where(r => r.IsActive)
            .OrderByDescending(r => r.StartedAt)
            .Select(r => new LiveRoomDto(
                r.Id,
                r.HostId,
                r.Host.Name,
                r.Host.ProfileImageUrl,
                r.LiveKitRoomName,
                r.Title,
                r.CoverImageUrl,
                r.ViewersCount,
                r.StartedAt
            ))
            .ToListAsync();
    }

    public async Task<LiveRoomDto> CreateRoomAsync(Guid hostId, CreateLiveRoomRequest req)
    {
        var host = await db.Users.FindAsync(hostId) ?? throw new KeyNotFoundException("Host not found");

        var room = new LiveRoom
        {
            HostId = hostId,
            LiveKitRoomName = $"live-{Guid.NewGuid()}",
            Title = req.Title,
            CoverImageUrl = req.CoverImageUrl,
            IsActive = true
        };

        db.LiveRooms.Add(room);
        await db.SaveChangesAsync();

        return new LiveRoomDto(
            room.Id,
            room.HostId,
            host.Name,
            host.ProfileImageUrl,
            room.LiveKitRoomName,
            room.Title,
            room.CoverImageUrl,
            room.ViewersCount,
            room.StartedAt
        );
    }

    public async Task EndRoomAsync(Guid hostId, Guid roomId)
    {
        var room = await db.LiveRooms.FirstOrDefaultAsync(r => r.Id == roomId && r.HostId == hostId);
        if (room != null)
        {
            room.IsActive = false;
            room.EndedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }
}
