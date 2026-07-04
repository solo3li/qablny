using Microsoft.AspNetCore.Mvc;
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
        PendingUsers = await db.Users
            .Where(u => u.ProfileImageUrl != null && !u.IsProfileImageApproved)
            .OrderByDescending(u => u.JoinedAt)
            .Take(24)
            .ToListAsync();
    }

    public async Task<IActionResult> OnPostApproveAsync(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user != null)
        {
            user.IsProfileImageApproved = true;
            await db.SaveChangesAsync();
            TempData["SuccessMessage"] = $"تمت الموافقة على صورة {user.Name}";
        }
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostRejectAsync(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user != null)
        {
            user.ProfileImageUrl = null;
            user.IsProfileImageApproved = false;
            await db.SaveChangesAsync();
            TempData["SuccessMessage"] = $"تم رفض وحذف صورة {user.Name}";
        }
        return RedirectToPage();
    }
}
