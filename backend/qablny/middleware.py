from django.urls import resolve, Resolver404

class SlashNormalizationMiddleware:
    """
    Middleware that silently matches requests with or without trailing slash
    without issuing 301/302 HTTP redirects that drop POST/PUT/DELETE request payloads.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response.status_code == 404:
            path = request.path_info
            if not path or path in ('/', ''):
                return response
            if path.endswith('/') and len(path) > 1:
                alt_path = path.rstrip('/')
            else:
                alt_path = path + '/'

            try:
                match = resolve(alt_path)
                # Re-run view handler with alt_path
                request.path_info = alt_path
                return match.func(request, *match.args, **match.kwargs)
            except Resolver404:
                pass
        return response
