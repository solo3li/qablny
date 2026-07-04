using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;
using Qablny.Enums;

namespace Qablny.Areas.Admin.Pages.Moderation;

public class ReportsModel(AppDbContext db) : PageModel
{
    public List<Report> ActiveReports { get; set; } = [];
    public string? SuccessMessage { get; set; }

    public async Task OnGetAsync()
    {
        ActiveReports = await db.Reports
            .Include(r => r.Reporter)
            .Include(r => r.ReportedUser)
            .Where(r => r.Status == ReportStatus.Pending)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<IActionResult> OnPostBanAsync(Guid reportId, Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user != null)
        {
            user.IsBlocked = true;
            await db.SaveChangesAsync();
        }

        var report = await db.Reports.FindAsync(reportId);
        if (report != null)
        {
            report.Status = ReportStatus.ActionTaken;
            report.AdminNote = "تم حظر المستخدم";
            await db.SaveChangesAsync();
        }

        TempData["SuccessMessage"] = $"تم حظر المستخدم بنجاح.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostDismissAsync(Guid reportId)
    {
        var report = await db.Reports.FindAsync(reportId);
        if (report != null)
        {
            report.Status = ReportStatus.Dismissed;
            report.AdminNote = "تم تجاهل البلاغ من قِبل الإدارة";
            await db.SaveChangesAsync();
        }

        TempData["SuccessMessage"] = "تم تجاهل البلاغ.";
        return RedirectToPage();
    }
}
