using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Matchmaking;

public class FilterPricingModel(AppDbContext db) : PageModel
{
    [BindProperty] public int GenderFilterCost { get; set; } = 10;
    [BindProperty] public int LocationFilterCost { get; set; } = 5;
    [BindProperty] public int InterestFilterCost { get; set; } = 0;
    [BindProperty] public int AgeFilterCost { get; set; } = 0;

    public async Task OnGetAsync()
    {
        var settings = await db.SystemSettings.ToDictionaryAsync(s => s.Key, s => s.Value);
        if (settings.TryGetValue("Matchmaking:GenderFilterCost", out var g) && int.TryParse(g, out var gc)) GenderFilterCost = gc;
        if (settings.TryGetValue("Matchmaking:LocationFilterCost", out var l) && int.TryParse(l, out var lc)) LocationFilterCost = lc;
        if (settings.TryGetValue("Matchmaking:InterestFilterCost", out var i) && int.TryParse(i, out var ic)) InterestFilterCost = ic;
        if (settings.TryGetValue("Matchmaking:AgeFilterCost", out var a) && int.TryParse(a, out var ac)) AgeFilterCost = ac;
    }

    public async Task<IActionResult> OnPostSaveAsync()
    {
        await UpsertAsync("Matchmaking:GenderFilterCost", GenderFilterCost.ToString(), "تكلفة فلتر الجنس بالعملات");
        await UpsertAsync("Matchmaking:LocationFilterCost", LocationFilterCost.ToString(), "تكلفة فلتر الموقع بالعملات");
        await UpsertAsync("Matchmaking:InterestFilterCost", InterestFilterCost.ToString(), "تكلفة فلتر الاهتمامات بالعملات");
        await UpsertAsync("Matchmaking:AgeFilterCost", AgeFilterCost.ToString(), "تكلفة فلتر السن بالعملات");
        await db.SaveChangesAsync();
        TempData["SuccessMessage"] = "تم حفظ أسعار الفلاتر بنجاح.";
        return RedirectToPage();
    }

    private async Task UpsertAsync(string key, string value, string description)
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == key);
        if (setting == null) db.SystemSettings.Add(new SystemSetting { Key = key, Value = value, Description = description });
        else setting.Value = value;
    }
}
