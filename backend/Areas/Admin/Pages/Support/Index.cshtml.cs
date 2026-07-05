using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Support
{
    public class IndexModel(AppDbContext db) : PageModel
    {
        public List<SupportTicket> Tickets { get; set; } = [];

        public async Task OnGetAsync()
        {
            Tickets = await db.SupportTickets
                .Include(t => t.User)
                .OrderBy(t => t.Status == "Open" ? 0 : 1)
                .ThenByDescending(t => t.UpdatedAt)
                .ToListAsync();
        }
    }
}
