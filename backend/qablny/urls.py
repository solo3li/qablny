import os
import inngest.django
from django.contrib import admin
from django.conf import settings
from django.urls import path, re_path
from django.views.static import serve
from django.http import JsonResponse
from django.utils import timezone
from django.shortcuts import redirect
from qablny.api import api
from qablny.inngest_client import inngest_client, inngest_functions

def root_redirect(request):
    return redirect('/admin/')

def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "time": timezone.now().isoformat()
    })

from django.views.decorators.csrf import csrf_exempt

inngest_pattern = inngest.django.serve(
    inngest_client,
    inngest_functions,
    serve_origin=os.getenv('INNGEST_SERVE_ORIGIN', 'http://api:8080')
)
_orig_callback = inngest_pattern.callback

@csrf_exempt
def logged_inngest_view(request, *args, **kwargs):
    import traceback
    try:
        resp = _orig_callback(request, *args, **kwargs)
        if hasattr(resp, 'status_code') and resp.status_code >= 400:
            print("INNGEST ERROR RESPONSE:", resp.status_code, resp.content.decode('utf-8', errors='ignore'))
        return resp
    except Exception as e:
        print("INNGEST EXCEPTION IN VIEW:", e)
        traceback.print_exc()
        raise

inngest_pattern.callback = logged_inngest_view

def root_boost_view(request):
    from qablny.auth import decode_jwt
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JsonResponse({"message": "Unauthorized"}, status=401)
    token = auth_header[7:]
    payload = decode_jwt(token)
    if not payload:
        return JsonResponse({"message": "Invalid token"}, status=401)
    user_id = payload.get("sub") or payload.get("nameid")
    from apps.users.models import User
    from apps.match.service import MatchmakingService
    user = User.objects.filter(id=user_id).first()
    if not user:
        return JsonResponse({"message": "User not found"}, status=404)
    if request.method == "POST":
        res = MatchmakingService.activate_boost(user)
        return JsonResponse(res)
    else:
        is_boosted, ttl = MatchmakingService.is_boosted(user.id)
        return JsonResponse({
            "isBoosted": is_boosted,
            "expiresInSeconds": ttl,
            "coinsRemaining": user.coins,
            "isVip": user.is_vip
        })

urlpatterns = [
    path('', root_redirect),
    path('admin/', admin.site.urls),
    path('api/', api.urls),
    inngest_pattern,
    path('health', health_check),
    path('health/', health_check),
    path('boost', csrf_exempt(root_boost_view)),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]
