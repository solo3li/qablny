using Microsoft.AspNetCore.Mvc;
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

    public async Task<IActionResult> OnPostUnbanAsync(Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user != null)
        {
            user.IsBlocked = false;
            await db.SaveChangesAsync();
            TempData["SuccessMessage"] = $"تم إلغاء حظر المستخدم {user.Name} بنجاح.";
        }
        return RedirectToPage();
    }
}
