using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Communications;

public class GlobalModel(AppDbContext db) : PageModel
{
    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostSendAsync(string title, string body)
    {
        // This is a mockup of sending FCM global notification
        var log = new PushNotificationLog 
        {
            Title = title,
            Body = body,
            TargetAudience = "Global",
            SentAt = DateTime.UtcNow,
            SentCount = 1500 // mock
        };
        
        db.PushNotificationLogs.Add(log);
        await db.SaveChangesAsync();

        return RedirectToPage();
    }
}
