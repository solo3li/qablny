using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Qablny.Areas.Admin.Pages;

public class IndexModel : PageModel
{
    public int TotalUsers { get; set; } = 1542;
    public int ActiveMatches { get; set; } = 42;
    public decimal DailyRevenue { get; set; } = 450.50m;
    public int OpenReports { get; set; } = 8;

    public void OnGet()
    {
        // Mock data logic goes here. HTMX can call specific handler methods if needed.
    }
}
