using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;

namespace Qablny.Areas.Admin.Pages.Matchmaking;

public class FilterPricingModel(AppDbContext db) : PageModel
{
    public decimal GenderFilterCost { get; set; } = 10;
    public decimal LocationFilterCost { get; set; } = 5;

    public async Task OnGetAsync()
    {
        var settings = await db.SystemSettings.ToDictionaryAsync(s => s.Key, s => s.Value);
        
        if (settings.TryGetValue("Matchmaking:GenderFilterCost", out var g) && decimal.TryParse(g, out var gc)) GenderFilterCost = gc;
        if (settings.TryGetValue("Matchmaking:LocationFilterCost", out var l) && decimal.TryParse(l, out var lc)) LocationFilterCost = lc;
    }
}
