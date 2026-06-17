using Qablny.Domain.Enums;

namespace Qablny.Domain.Entities;

public class Friendship
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RequesterId { get; set; }
    public Guid AddresseeId { get; set; }
    public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Requester { get; set; } = default!;
    public User Addressee { get; set; } = default!;
}

public class Conversation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid User1Id { get; set; }
    public Guid User2Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

    public User User1 { get; set; } = default!;
    public User User2 { get; set; } = default!;
    public ICollection<Message> Messages { get; set; } = [];
}

public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public Guid ReceiverId { get; set; }
    public MessageType Type { get; set; } = MessageType.Text;

    // Text
    public string? Content { get; set; }
    public string? Translation { get; set; }

    // Voice
    public int? DurationSeconds { get; set; }

    // Image / Video
    public string? MediaUrl { get; set; }

    // Location
    public string? LocationName { get; set; }
    public double? LocationLat { get; set; }
    public double? LocationLng { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Conversation Conversation { get; set; } = default!;
    public User Sender { get; set; } = default!;
    public User Receiver { get; set; } = default!;
}
