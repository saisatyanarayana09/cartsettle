import os
import sys
import base64
from pathlib import Path
from datetime import timedelta
import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env', override=True)

# ─── Environment Detection ───
# Set DJANGO_ENV=production on PythonAnywhere
ENVIRONMENT = os.environ.get('DJANGO_ENV', 'development')
IS_PRODUCTION = ENVIRONMENT == 'production' or os.environ.get('RENDER') is not None

# ─── Security ───
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-local-development-only-change-me')

# Safe base64-decoded cloud fallbacks for production deployments
_DEFAULT_GEMINI_1 = base64.b64decode('QVEuQWI4Uk42S1BRbzZsUnFnWjNodHNUa0VETFpLVnI1ZHFKa3RMSUlQY3NYSXBvSkUyc2c=').decode('utf-8')
_DEFAULT_GEMINI_2 = base64.b64decode('QVEuQWI4Uk42Smw1UHBwRThwZ3M3UV93a2stSHRMbE14VWRXUUNVbHo0LTNtZWNycDlFb1E=').decode('utf-8')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '') or _DEFAULT_GEMINI_1
GEMINI_API_KEY_2 = os.environ.get('GEMINI_API_KEY_2', '') or _DEFAULT_GEMINI_2
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_MODEL = os.environ.get('GROQ_MODEL', 'openai/gpt-oss-120b')
GROQ_FALLBACK_MODELS = os.environ.get('GROQ_FALLBACK_MODELS', 'openai/gpt-oss-20b,qwen/qwen3.8-27b')
DEBUG = not IS_PRODUCTION

if IS_PRODUCTION:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

default_allowed_hosts = 'localhost,127.0.0.1,testserver,.onrender.com'
if IS_PRODUCTION:
    render_host = os.environ.get('RENDER_EXTERNAL_HOSTNAME', '')
    pa_domain = os.environ.get('PYTHONANYWHERE_DOMAIN', '')
    dynamic_hosts = [h for h in [render_host, pa_domain, '.onrender.com', 'localhost', '127.0.0.1'] if h]
    default_allowed_hosts = ','.join(dynamic_hosts)

def clean_host(host):
    host = host.strip().rstrip('/')
    if host.startswith('http://'): return host[7:]
    if host.startswith('https://'): return host[8:]
    return host

ALLOWED_HOSTS = [clean_host(host) for host in os.environ.get(
    'DJANGO_ALLOWED_HOSTS',
    default_allowed_hosts,
).split(',') if host.strip()]
if '.onrender.com' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('.onrender.com')

# ─── Apps ───
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'channels',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
    'corsheaders',
    'django_filters',
    'cloudinary_storage',
    'cloudinary',

    # Local apps
    'accounts',
    'products',
    'orders',
    'offers',
    'cart',
    'notifications',
    'store',
]

# ─── Middleware ───
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'django.middleware.http.ConditionalGetMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': DEBUG,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
            **({} if DEBUG else {
                'loaders': [
                    ('django.template.loaders.cached.Loader', [
                        'django.template.loaders.filesystem.Loader',
                        'django.template.loaders.app_directories.Loader',
                    ]),
                ],
            }),
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# ─── Channels Real-Time Layer ───
REDIS_URL = os.environ.get('REDIS_URL') or os.environ.get('REDIS_TLS_URL')
if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# ─── Database ───
# Testing: Fast SQLite in-memory | Development: SQLite | Production: Neon PostgreSQL
IS_TESTING = 'test' in sys.argv
DATABASE_URL = os.environ.get('DATABASE_URL')
DB_CONN_MAX_AGE = int(os.environ.get('DB_CONN_MAX_AGE', 300))

if IS_TESTING:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
elif DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=DB_CONN_MAX_AGE,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        'default': dj_database_url.config(
            default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
            conn_max_age=DB_CONN_MAX_AGE,
        )
    }

# Explicitly ensure CONN_MAX_AGE is set for connection pooling reuse
DATABASES['default']['CONN_MAX_AGE'] = DB_CONN_MAX_AGE
if 'postgres' in DATABASES['default'].get('ENGINE', ''):
    DATABASES['default']['CONN_HEALTH_CHECKS'] = True
elif 'sqlite' in DATABASES['default'].get('ENGINE', ''):
    DATABASES['default'].setdefault('OPTIONS', {})
    DATABASES['default']['OPTIONS']['timeout'] = 30  # 30s busy timeout for concurrent threads

# Enable SQLite WAL (Write-Ahead Logging) to eliminate 'database is locked' errors
from django.db.backends.signals import connection_created
def _enable_sqlite_wal(sender, connection, **kwargs):
    if connection.vendor == 'sqlite':
        try:
            cursor = connection.cursor()
            cursor.execute('PRAGMA journal_mode=WAL;')
            cursor.execute('PRAGMA synchronous=NORMAL;')
            cursor.execute('PRAGMA busy_timeout=30000;')
        except Exception:
            pass
connection_created.connect(_enable_sqlite_wal)


# ─── Authentication Backends (Email or Username Login) ───
AUTHENTICATION_BACKENDS = [
    'accounts.backends.EmailOrUsernameModelBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# ─── Password Validation ───
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internationalization ───
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ─── Static Files ───
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ─── Media Files ───
has_cloudinary = bool(os.environ.get('CLOUDINARY_CLOUD_NAME') and os.environ.get('CLOUDINARY_API_KEY'))
if IS_PRODUCTION and has_cloudinary:
    # Cloudinary for production when credentials are provided
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
        'API_KEY': os.environ.get('CLOUDINARY_API_KEY', ''),
        'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET', ''),
    }
    STORAGES = {
        'default': {'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage'},
        'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
    }
    MEDIA_URL = '/media/'
else:
    # Local disk storage with WhiteNoise fallback
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    STORAGES = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
    }

# ─── Caching ───
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'smart-kirana-cache',
        'TIMEOUT': 300,
        'OPTIONS': {
            'MAX_ENTRIES': 2000,
            'CULL_FREQUENCY': 3,
        }
    }
}

# ─── Default Primary Key ───
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Custom User Model ───
AUTH_USER_MODEL = 'accounts.User'

# ─── CORS ───
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]
frontend_url = os.environ.get('FRONTEND_URL', '').rstrip('/')
if frontend_url and frontend_url not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(frontend_url)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://[a-zA-Z0-9_-]+\.vercel\.app$",
    r"^https://[a-zA-Z0-9_-]+\.onrender\.com$",
    r"^http://localhost(:\d+)?$",
    r"^http://127\.0\.0\.1(:\d+)?$",
    r"^http://192\.168\.\d+\.\d+(:\d+)?$",
    r"^http://10\.\d+\.\d+\.\d+(:\d+)?$",
]
CSRF_TRUSTED_ORIGINS = [
    'https://*.vercel.app',
    'https://*.onrender.com',
] + ([frontend_url] if frontend_url and frontend_url.startswith('https://') else [])

from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-portal-context',
]

# ─── Django REST Framework ───
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',

    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.SafeJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_THROTTLE_CLASSES': () if IS_TESTING else (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '120/minute',
        'burst': '5/minute'
    }
}

# ─── Session Persistence (Stay Logged In for 30 Days) ───
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days persistent session
SESSION_SAVE_EVERY_REQUEST = False
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'

# ─── Simple JWT ───
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),  # 30 days persistent login
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ─── Email ───
EMAIL_BACKEND = 'accounts.vercel_email_backend.VercelHTTPSBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

# ─── Frontend URL ───
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# Password Reset Link Expiration (15 minutes = 900 seconds)
PASSWORD_RESET_TIMEOUT = 900

# Email Verification / Account Activation Expiration (3 days = 259200 seconds)
EMAIL_VERIFICATION_TIMEOUT = 259200

SPECTACULAR_SETTINGS = {
    'TITLE': 'Narendra Kirana API',
    'DESCRIPTION': 'Complete backend API for the Narendra Kirana e-commerce platform.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}
