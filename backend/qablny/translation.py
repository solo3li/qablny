import logging
import requests
from django.conf import settings

logger = logging.getLogger("TranslationService")

def translate_text(text: str, target: str = "en") -> str | None:
    if not text:
        return None
    url = f"{settings.LIBRETRANSLATE_BASE_URL.rstrip('/')}/translate"
    try:
        res = requests.post(
            url,
            json={"q": text, "source": "auto", "target": target, "format": "text"},
            timeout=5.0
        )
        if res.status_code == 200:
            data = res.json()
            return data.get("translatedText")
    except Exception as e:
        logger.debug(f"Translation error: {e}")
    return None
