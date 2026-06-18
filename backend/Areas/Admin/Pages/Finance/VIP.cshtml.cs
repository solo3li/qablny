using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Finance;

public class VIPModel(AppDbContext db) : PageModel
{
    public List<VipPlan> Plans { get; set; } = [];

    public async Task OnGetAsync()
    {
        Plans = await db.VipPlans.ToListAsync();
    }
}
