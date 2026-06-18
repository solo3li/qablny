using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Users;

public class ProfilesModel(AppDbContext db) : PageModel
{
    [BindProperty(SupportsGet = true)]
    public Guid? Id { get; set; }

    public User? AppUser { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        if (Id.HasValue)
        {
            AppUser = await db.Users.FirstOrDefaultAsync(u => u.Id == Id.Value);
        }
        return Page();
    }
}
