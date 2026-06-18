using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Staff;

public class ShiftsModel(AppDbContext db) : PageModel
{
    public List<StaffShift> Shifts { get; set; } = [];

    public async Task OnGetAsync()
    {
        Shifts = await db.StaffShifts
            .Include(s => s.AdminUser)
            .OrderByDescending(s => s.StartTime)
            .Take(50)
            .ToListAsync();
    }
}
