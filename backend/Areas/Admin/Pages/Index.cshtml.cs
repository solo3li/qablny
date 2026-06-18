using Microsoft.AspNetCore.Mvc.RazorPages;

using Qablny.Data;
using Microsoft.EntityFrameworkCore;
using Qablny.Enums;

namespace Qablny.Areas.Admin.Pages;

public class IndexModel(AppDbContext db) : PageModel
{
    public int TotalUsers { get; set; }
    public int ActiveMatches { get; set; }
    public decimal DailyRevenue { get; set; }
    public int OpenReports { get; set; }

    public async Task OnGetAsync()
    {
        TotalUsers = await db.Users.CountAsync();
        ActiveMatches = await db.MatchSessions.CountAsync(m => m.EndedAt == null);
        
        var today = DateTime.UtcNow.Date;
        var vipRevenue = await db.VipSubscriptions
            .Where(v => v.StartedAt >= today)
            .SumAsync(v => v.PricePaid);
            
        DailyRevenue = vipRevenue; // In a real app we would add Coin Purchases here too
        
        OpenReports = await db.Reports.CountAsync(r => r.Status == ReportStatus.Pending);
    }
}
