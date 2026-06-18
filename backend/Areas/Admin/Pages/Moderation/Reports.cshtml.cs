using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Moderation;

public class ReportsModel(AppDbContext db) : PageModel
{
    public List<Report> ActiveReports { get; set; } = [];

    public async Task OnGetAsync()
    {
        ActiveReports = await db.Reports
            .Include(r => r.Reporter)
            .Include(r => r.ReportedUser)
            .Where(r => r.Status == Enums.ReportStatus.Pending)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();
    }
}
