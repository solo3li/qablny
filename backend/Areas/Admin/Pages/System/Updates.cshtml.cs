using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.System;

public class UpdatesModel(AppDbContext db) : PageModel
{
    [BindProperty] public string MinVersionIOS { get; set; } = "1.0.0";
    [BindProperty] public string MinVersionAndroid { get; set; } = "1.0.0";

    public async Task OnGetAsync()
    {
        var settings = await db.SystemSettings.ToDictionaryAsync(s => s.Key, s => s.Value);
        if (settings.TryGetValue("App:MinVersionIOS", out var ios)) MinVersionIOS = ios;
        if (settings.TryGetValue("App:MinVersionAndroid", out var android)) MinVersionAndroid = android;
    }

    public async Task<IActionResult> OnPostSaveAsync()
    {
        await UpsertSettingAsync("App:MinVersionIOS", MinVersionIOS, "الحد الأدنى لإصدار iOS المطلوب");
        await UpsertSettingAsync("App:MinVersionAndroid", MinVersionAndroid, "الحد الأدنى لإصدار Android المطلوب");
        await db.SaveChangesAsync();
        TempData["SuccessMessage"] = $"تم الحفظ. iOS: {MinVersionIOS} | Android: {MinVersionAndroid}";
        return RedirectToPage();
    }

    private async Task UpsertSettingAsync(string key, string value, string description)
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == key);
        if (setting == null)
            db.SystemSettings.Add(new SystemSetting { Key = key, Value = value, Description = description });
        else
            setting.Value = value;
    }
}
