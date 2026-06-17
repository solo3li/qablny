using Qablny.DTOs;
using System.Net;
using System.Text.Json;

namespace Qablny.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
            await HandleAsync(ctx, ex);
        }
    }

    private static Task HandleAsync(HttpContext ctx, Exception ex)
    {
        var (status, message) = ex switch
        {
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized,  ex.Message),
            KeyNotFoundException        => (HttpStatusCode.NotFound,       ex.Message),
            InvalidOperationException   => (HttpStatusCode.BadRequest,     ex.Message),
            ArgumentException           => (HttpStatusCode.BadRequest,     ex.Message),
            _                          => (HttpStatusCode.InternalServerError, "خطأ داخلي في الخادم")
        };

        ctx.Response.StatusCode  = (int)status;
        ctx.Response.ContentType = "application/json";

        return ctx.Response.WriteAsync(JsonSerializer.Serialize(
            new ErrorResponse(message, ex.GetType().Name)));
    }
}
