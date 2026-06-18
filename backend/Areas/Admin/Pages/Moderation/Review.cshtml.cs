using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Moderation;

public class ReviewModel(AppDbContext db) : PageModel
{
    public List<User> PendingUsers { get; set; } = [];

    public async Task OnGetAsync()
    {
        // For demonstration: find users with a profile image who joined recently
        PendingUsers = await db.Users
            .Where(u => u.ProfileImageUrl != null)
            .OrderByDescending(u => u.JoinedAt)
            .Take(12)
            .ToListAsync();
    }
}
