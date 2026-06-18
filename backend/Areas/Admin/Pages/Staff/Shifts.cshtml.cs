using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Collections.Generic;

namespace Qablny.Areas.Admin.Pages.Staff;

public class ShiftDto
{
    public string EmployeeName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string ShiftTime { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class ShiftsModel : PageModel
{
    public List<ShiftDto> Shifts { get; set; } = new();

    public void OnGet()
    {
        Shifts = new List<ShiftDto>
        {
            new ShiftDto { EmployeeName = "أحمد خالد", Role = "مشرف وردية", ShiftTime = "08:00 AM - 04:00 PM", Status = "نشط" },
            new ShiftDto { EmployeeName = "سارة محمد", Role = "مراقب محتوى", ShiftTime = "08:00 AM - 04:00 PM", Status = "نشط" },
            new ShiftDto { EmployeeName = "خالد حسن", Role = "دعم فني", ShiftTime = "04:00 PM - 12:00 AM", Status = "غير متصل" }
        };
    }
}
