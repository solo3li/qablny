using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;

namespace Qablny.Areas.Admin.Pages.System;

public class UpdatesModel(AppDbContext db) : PageModel
{
    public string MinVersionIOS { get; set; } = "1.0.0";
    public string MinVersionAndroid { get; set; } = "1.0.0";

    public async Task OnGetAsync()
    {
        var settings = await db.SystemSettings.ToDictionaryAsync(s => s.Key, s => s.Value);
        
        if (settings.TryGetValue("App:MinVersionIOS", out var ios)) MinVersionIOS = ios;
        if (settings.TryGetValue("App:MinVersionAndroid", out var android)) MinVersionAndroid = android;
    }
}
