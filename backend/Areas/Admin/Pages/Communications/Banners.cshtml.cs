using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Communications;

public class BannersModel(AppDbContext db) : PageModel
{
    public List<Banner> Banners { get; set; } = [];

    public async Task OnGetAsync()
    {
        Banners = await db.Banners.OrderByDescending(b => b.CreatedAt).ToListAsync();
    }
}
