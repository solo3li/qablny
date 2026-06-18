using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Staff;

public class AuditLogsModel(AppDbContext db) : PageModel
{
    public List<AuditLog> Logs { get; set; } = [];

    public async Task OnGetAsync()
    {
        Logs = await db.AuditLogs
            .Include(a => a.AdminUser)
            .OrderByDescending(a => a.CreatedAt)
            .Take(100)
            .ToListAsync();
    }
}
