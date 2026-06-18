using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Finance;

public class TransactionsModel(AppDbContext db) : PageModel
{
    public List<VipSubscription> VipSales { get; set; } = [];

    public async Task OnGetAsync()
    {
        // Load recent VIP sales, including User and Plan info
        VipSales = await db.VipSubscriptions
            .Include(v => v.User)
            .Include(v => v.Plan)
            .OrderByDescending(v => v.StartedAt)
            .Take(50)
            .ToListAsync();
    }
}
