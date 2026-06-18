using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Moderation;

public class PenaltiesModel(AppDbContext db) : PageModel
{
    public List<User> BlockedUsers { get; set; } = [];

    public async Task OnGetAsync()
    {
        BlockedUsers = await db.Users
            .Where(u => u.IsBlocked)
            .OrderByDescending(u => u.JoinedAt)
            .ToListAsync();
    }
}
