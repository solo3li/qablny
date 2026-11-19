import logging
import requests

logger = logging.getLogger("PushNotificationService")
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

def send_expo_push(to: str, title: str, body: str, data: dict = None) -> bool:
    if not to or not to.startswith("ExponentPushToken["):
        return False

    payload = {
        "to": to,
        "title": title,
        "body": body,
        "data": data or {},
        "sound": "default",
    }
    try:
        res = requests.post(EXPO_PUSH_URL, json=payload, timeout=5.0)
        return res.status_code == 200
    except Exception as e:
        logger.warning(f"Error sending push notification to {to}: {e}")
        return False

def send_bulk_expo_push(tokens: list[str], title: str, body: str, data: dict = None) -> int:
    valid_tokens = [t for t in tokens if t and t.startswith("ExponentPushToken[")]
    if not valid_tokens:
        return 0

    sent = 0
    # Expo allows chunks of 100
    for i in range(0, len(valid_tokens), 100):
        chunk = valid_tokens[i:i+100]
        payloads = [
            {
                "to": token,
                "title": title,
                "body": body,
                "data": data or {},
                "sound": "default",
            }
            for token in chunk
        ]
        try:
            res = requests.post(EXPO_PUSH_URL, json=payloads, timeout=5.0)
            if res.status_code == 200:
                sent += len(chunk)
        except Exception as e:
            logger.warning(f"Error sending bulk push: {e}")
    return sent
