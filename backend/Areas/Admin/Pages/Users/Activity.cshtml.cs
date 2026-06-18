using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Users;

public class ActivityModel(AppDbContext db) : PageModel
{
    public List<MatchSession> RecentMatches { get; set; } = [];

    public async Task OnGetAsync()
    {
        RecentMatches = await db.MatchSessions
            .Include(m => m.User1)
            .Include(m => m.User2)
            .OrderByDescending(m => m.StartedAt)
            .Take(50)
            .ToListAsync();
    }
}
