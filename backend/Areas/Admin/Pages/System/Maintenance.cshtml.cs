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
        {
            IsMaintenanceMode = val;
        }
    }
}
