import os
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-qablny-secret-key-2026-very-long-and-secure')
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1')

ALLOWED_HOSTS = ['*']

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

CSRF_TRUSTED_ORIGINS = [
    'https://api-qablny.169.58.32.179.nip.io',
    'https://qablny.169.58.32.179.nip.io',
    'https://*.nip.io',
    'http://api-qablny.169.58.32.179.nip.io',
    'http://qablny.169.58.32.179.nip.io',
    'http://*.nip.io',
    'http://localhost:5050',
    'http://127.0.0.1:5050',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'apps.users',
    'apps.friends',
    'apps.monetization',
    'apps.match',
    'apps.live',
    'apps.rooms',
    'apps.agency',
    'apps.support',
    'apps.realtime',
    'apps.system',
    'apps.map',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'qablny.middleware.SlashNormalizationMiddleware',
    'ninja.compatibility.files.fix_request_files_middleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'qablny.urls'
APPEND_SLASH = False

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'qablny.wsgi.application'
ASGI_APPLICATION = 'qablny.asgi.application'

# Database configuration
db_url = os.getenv('DATABASE_URL')
if db_url:
    parsed = urlparse(db_url)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path.lstrip('/'),
            'USER': parsed.username,
            'PASSWORD': parsed.password,
            'HOST': parsed.hostname,
            'PORT': str(parsed.port or 5432),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'qablny'),
            'USER': os.getenv('POSTGRES_USER', 'postgres'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'postgres123'),
            'HOST': os.getenv('POSTGRES_HOST', 'postgres'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'ar'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ['*']
CORS_ALLOW_METHODS = ['*']

# Application-specific environment variables
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')

JWT_SECRET = os.getenv('JWT_SECRET', 'supersecretjwtkeythatislongenoughforhmacsha256!')
JWT_ISSUER = os.getenv('JWT_ISSUER', 'qablny-api')
JWT_AUDIENCE = os.getenv('JWT_AUDIENCE', 'qablny-app')
JWT_EXPIRY_MINUTES = int(os.getenv('JWT_EXPIRY_MINUTES', '60'))

LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY', 'devkey')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET', 'devsecret1234567890')
LIVEKIT_SERVER_URL = os.getenv('LIVEKIT_SERVER_URL', 'http://livekit:7880')
LIVEKIT_PUBLIC_URL = os.getenv('LIVEKIT_PUBLIC_URL', 'wss://livekit-qablny.169.58.32.179.nip.io')

MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'minio:9000')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin123')
MINIO_PUBLIC_URL = os.getenv('MINIO_PUBLIC_URL', 'https://minio-qablny.169.58.32.179.nip.io')
MINIO_SECURE = os.getenv('MINIO_SECURE', 'False').lower() == 'true'

LIBRETRANSLATE_BASE_URL = os.getenv('LIBRETRANSLATE_BASE_URL', 'http://libretranslate:5000')

CENTRIFUGO_HTTP_API_URL = os.getenv('CENTRIFUGO_HTTP_API_URL', 'http://centrifugo:8000/api')
CENTRIFUGO_API_KEY = os.getenv('CENTRIFUGO_API_KEY', 'qablny-centrifugo-api-key-2026-very-secure')
CENTRIFUGO_SECRET_KEY = os.getenv('CENTRIFUGO_SECRET_KEY', 'qablny-centrifugo-hmac-secret-key-super-secure-2026')
CENTRIFUGO_PUBLIC_URL = os.getenv('CENTRIFUGO_PUBLIC_URL', 'wss://centrifugo-qablny.169.58.32.179.nip.io/connection/websocket')

INNGEST_BASE_URL = os.getenv('INNGEST_BASE_URL', 'http://inngest:8288')
INNGEST_PUBLIC_URL = os.getenv('INNGEST_PUBLIC_URL', 'https://inngest-qablny.169.58.32.179.nip.io')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'inngest': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
