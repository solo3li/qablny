using System;

class Program {
    static void Main() {
        var hash = "$2a$11$9/0g/H4eEOf2h7W/P1lM/OWGvG6H/5f4wE8E9E3L3V7Z6u7V/u1L2";
        bool result = BCrypt.Net.BCrypt.Verify("admin", hash);
        Console.WriteLine(result);
    }
}
