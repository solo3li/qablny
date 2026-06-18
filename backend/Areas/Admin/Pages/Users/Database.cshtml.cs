using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Qablny.Data;
using Qablny.Entities;

namespace Qablny.Areas.Admin.Pages.Users;

public class DatabaseModel(AppDbContext db) : PageModel
{
    public List<User> AppUsers { get; set; } = [];

    [BindProperty(SupportsGet = true)]
    public string? SearchTerm { get; set; }

    public async Task OnGetAsync()
    {
        var query = db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(SearchTerm))
        {
            var term = SearchTerm.Trim().ToLower();
            query = query.Where(u => u.Name.ToLower().Contains(term) || u.Email.ToLower().Contains(term));
        }

        AppUsers = await query.OrderByDescending(u => u.JoinedAt).Take(100).ToListAsync();
    }
}
