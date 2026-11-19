import time
import logging
import json
import requests
import jwt
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder

logger = logging.getLogger("CentrifugoClient")

def generate_centrifugo_token(user_id: str, exp_seconds: int = 86400) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + exp_seconds,
    }
    return jwt.encode(payload, settings.CENTRIFUGO_SECRET_KEY, algorithm="HS256")

def publish_to_centrifugo(channel: str, event: str, data: dict, timeout: float = 2.0) -> bool:
    """
    Publish an event and data payload to a Centrifugo channel.
    Event payload format: { "event": event, "data": data }
    """
    if not channel:
        return False

    api_url = getattr(settings, 'CENTRIFUGO_HTTP_API_URL', 'http://centrifugo:8000/api')
    api_key = getattr(settings, 'CENTRIFUGO_API_KEY', '')

    url = f"{api_url.rstrip('/')}/publish"
    headers = {
        "Authorization": f"apikey {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "channel": channel,
        "data": {
            "event": event,
            "data": data
        },
    }

    try:
        body = json.dumps(payload, cls=DjangoJSONEncoder)
        res = requests.post(url, data=body, headers=headers, timeout=timeout)
        if res.status_code == 200:
            return True
        logger.error(f"Centrifugo publish error for channel '{channel}' ({res.status_code}): {res.text}")
        return False
    except Exception as e:
        logger.error(f"Failed to publish to Centrifugo channel '{channel}': {e}")
        return False

def broadcast_to_centrifugo(channels: list[str], event: str, data: dict, timeout: float = 2.0) -> bool:
    if not channels:
        return False

    api_url = getattr(settings, 'CENTRIFUGO_HTTP_API_URL', 'http://centrifugo:8000/api')
    api_key = getattr(settings, 'CENTRIFUGO_API_KEY', '')

    url = f"{api_url.rstrip('/')}/broadcast"
    headers = {
        "Authorization": f"apikey {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "channels": channels,
        "data": {
            "event": event,
            "data": data
        },
    }

    try:
        body = json.dumps(payload, cls=DjangoJSONEncoder)
        res = requests.post(url, data=body, headers=headers, timeout=timeout)
        if res.status_code == 200:
            return True
        logger.error(f"Centrifugo broadcast error ({res.status_code}): {res.text}")
        return False
    except Exception as e:
        logger.error(f"Failed to broadcast to Centrifugo channels {channels}: {e}")
        return False
