using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;

namespace Qablny.Areas.Admin.Pages.System;

public class MaintenanceModel(AppDbContext db) : PageModel
{
    public bool IsMaintenanceMode { get; set; }

    public async Task OnGetAsync()
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "App:MaintenanceMode");
        if (setting != null && bool.TryParse(setting.Value, out var val))
            IsMaintenanceMode = val;
    }

    public async Task<IActionResult> OnPostToggleAsync()
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "App:MaintenanceMode");
        if (setting == null)
        {
            db.SystemSettings.Add(new Entities.SystemSetting
            {
                Key = "App:MaintenanceMode",
                Value = "true",
                Description = "تفعيل وضع الصيانة"
            });
            IsMaintenanceMode = true;
        }
        else
        {
            var current = bool.TryParse(setting.Value, out var val) && val;
            setting.Value = (!current).ToString().ToLower();
            IsMaintenanceMode = !current;
        }
        await db.SaveChangesAsync();
        TempData["SuccessMessage"] = IsMaintenanceMode ? "تم تفعيل وضع الصيانة 🛑" : "تم إلغاء وضع الصيانة ✅";
        return RedirectToPage();
    }
}
