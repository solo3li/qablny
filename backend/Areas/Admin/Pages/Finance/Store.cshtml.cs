using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Finance;

public class StoreModel(AppDbContext db) : PageModel
{
    public List<Gift> Gifts { get; set; } = [];

    public async Task OnGetAsync()
    {
        Gifts = await db.Gifts.ToListAsync();
    }
}
