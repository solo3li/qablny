namespace Qablny.DTOs;

public record LiveRoomDto(
    Guid Id,
    Guid HostId,
    string HostName,
    string? HostImageUrl,
    string LiveKitRoomName,
    string Title,
    string? CoverImageUrl,
    int ViewersCount,
    DateTime StartedAt
);

public record CreateLiveRoomRequest(
    string Title,
    string? CoverImageUrl
);
