using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;

namespace Qablny.Areas.Admin.Pages.Moderation;

public class BlacklistModel(AppDbContext db) : PageModel
{
    public List<string> Words { get; set; } = [];

    public async Task OnGetAsync()
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "App:BlacklistedWords");
        if (setting != null && !string.IsNullOrWhiteSpace(setting.Value))
        {
            Words = setting.Value.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(w => w.Trim()).ToList();
        }
    }
}
