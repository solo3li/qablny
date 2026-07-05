using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Support
{
    public class TicketModel(AppDbContext db) : PageModel
    {
        public SupportTicket Ticket { get; set; } = default!;
        public List<SupportMessage> Messages { get; set; } = [];

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var ticket = await db.SupportTickets
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == id);
                
            if (ticket == null) return NotFound();

            Ticket = ticket;
            Messages = await db.SupportMessages
                .Where(m => m.TicketId == id)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();

            return Page();
        }

        public async Task<IActionResult> OnPostCloseAsync(Guid id)
        {
            var ticket = await db.SupportTickets.FindAsync(id);
            if (ticket != null)
            {
                ticket.Status = "Closed";
                ticket.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }
            return RedirectToPage(new { id });
        }
    }
}
