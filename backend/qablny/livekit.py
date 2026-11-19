import uuid
import time
import jwt
from django.conf import settings

def generate_livekit_token(user_id, display_name: str, room_name: str, can_publish: bool = True) -> str:
    now = int(time.time())
    payload = {
        "iss": settings.LIVEKIT_API_KEY,
        "sub": str(user_id),
        "name": display_name or "User",
        "iat": now,
        "nbf": now,
        "exp": now + 6 * 3600,
        "video": {
            "room": room_name,
            "roomJoin": True,
            "canPublish": can_publish,
            "canSubscribe": True,
        }
    }
    return jwt.encode(payload, settings.LIVEKIT_API_SECRET, algorithm="HS256")

def new_room_name() -> str:
    return f"room_{uuid.uuid4().hex}"
