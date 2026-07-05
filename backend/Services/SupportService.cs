using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;
using Qablny.Enums;
using Qablny.DTOs;

namespace Qablny.Services;

public record CreateTicketRequest(string Subject);
public record SupportTicketDto(Guid Id, Guid UserId, string Subject, string Status, DateTime CreatedAt, DateTime UpdatedAt);
public record SupportMessageDto(Guid Id, Guid TicketId, Guid SenderId, bool IsAdmin, MessageType Type, string? Content, int? DurationSeconds, string? MediaUrl, DateTime CreatedAt);

public class SupportService(AppDbContext db, PushNotificationService pushNotification)
{
    public async Task<SupportTicketDto> CreateTicketAsync(Guid userId, CreateTicketRequest req, CancellationToken ct = default)
    {
        var ticket = new SupportTicket
        {
            UserId = userId,
            Subject = req.Subject,
            Status = "Open"
        };
        db.SupportTickets.Add(ticket);
        await db.SaveChangesAsync(ct);
        return ToDto(ticket);
    }

    public async Task<List<SupportTicketDto>> GetUserTicketsAsync(Guid userId, CancellationToken ct = default)
    {
        var tickets = await db.SupportTickets
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.UpdatedAt)
            .ToListAsync(ct);
        
        return tickets.Select(ToDto).ToList();
    }

    public async Task<List<SupportTicketDto>> GetAllTicketsAsync(CancellationToken ct = default)
    {
        var tickets = await db.SupportTickets
            .OrderByDescending(t => t.UpdatedAt)
            .ToListAsync(ct);
        
        return tickets.Select(ToDto).ToList();
    }

    public async Task<List<SupportMessageDto>> GetTicketMessagesAsync(Guid ticketId, CancellationToken ct = default)
    {
        var messages = await db.SupportMessages
            .Where(m => m.TicketId == ticketId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);
            
        return messages.Select(ToDto).ToList();
    }

    public async Task<SupportTicketDto?> CloseTicketAsync(Guid ticketId, CancellationToken ct = default)
    {
        var ticket = await db.SupportTickets.FindAsync([ticketId], ct);
        if (ticket == null) return null;

        ticket.Status = "Closed";
        ticket.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ToDto(ticket);
    }

    // This method is called by ChatHub
    public async Task<SupportMessageDto> SaveMessageAsync(Guid ticketId, Guid senderId, bool isAdmin, MessageType type, string? content, int? duration, string? mediaUrl, CancellationToken ct = default)
    {
        var ticket = await db.SupportTickets.FindAsync([ticketId], ct);
        if (ticket == null) throw new Exception("Ticket not found");

        var msg = new SupportMessage
        {
            TicketId = ticketId,
            SenderId = senderId,
            IsAdmin = isAdmin,
            Type = type,
            Content = content,
            DurationSeconds = duration,
            MediaUrl = mediaUrl
        };
        db.SupportMessages.Add(msg);
        
        ticket.UpdatedAt = DateTime.UtcNow;
        if (ticket.Status == "Closed")
        {
            ticket.Status = "Open"; // Reopen ticket if new message
        }

        await db.SaveChangesAsync(ct);

        // Send push notification if Admin replies
        if (isAdmin)
        {
            var user = await db.Users.FindAsync([ticket.UserId], ct);
            if (user?.ExpoPushToken != null)
            {
                var body = type == MessageType.Text ? content : $"أرسل لك الدعم الفني {type}";
                await pushNotification.SendPushAsync(user.ExpoPushToken, "رد من الدعم الفني", body ?? "رسالة جديدة", new { type = "support", ticketId = ticketId });
            }
        }

        return ToDto(msg);
    }

    private static SupportTicketDto ToDto(SupportTicket t) => new(t.Id, t.UserId, t.Subject, t.Status, t.CreatedAt, t.UpdatedAt);
    private static SupportMessageDto ToDto(SupportMessage m) => new(m.Id, m.TicketId, m.SenderId, m.IsAdmin, m.Type, m.Content, m.DurationSeconds, m.MediaUrl, m.CreatedAt);
}
