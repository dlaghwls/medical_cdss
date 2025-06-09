# medical_cdss-happy/backend/medical_cdss/medical_cdss/settings.py

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

dotenv_path = BASE_DIR / '.env'
load_dotenv(dotenv_path=dotenv_path)
print(f"DEBUG: Attempting to load .env from: {dotenv_path}")

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-key-fallback')
DEBUG_ENV = os.getenv('DEBUG', 'True')
DEBUG = DEBUG_ENV.lower() == 'true'

ALLOWED_HOSTS_ENV = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0,*,django-backend,medical-django-backend')
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_ENV.split(',')]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'openmrs_integration',
    'django_celery_beat',

    'rest_framework',
    'rest_framework.authtoken', # TokenAuthentication 사용 시 필요 (기존 유지)
    'corsheaders',

    # Local apps (기존에 있었던 앱들만 유지)
    'patients',
    'visits',
    'diagnoses',
    'cdss',
    'ml_models',
    'lab_results',
    'chat', # 메시지 기능이 불안정할 수 있지만, 앱은 유지 (만약 chat 앱도 없었다면 제거)
    # 'core', # ★★★ 제거 ★★★
    # 'vitals', # ★★★ 제거 ★★★
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'medical_cdss.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'medical_cdss.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'medical_cdss_fallback_db'),
        'USER': os.getenv('DB_USER', 'postgres_fallback_user'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres_fallback_pw'),
        'HOST': os.getenv('DB_HOST', 'postgres_fallback_host'),
        'PORT': os.getenv('DB_PORT', '5432_fallback_port'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ★★★ AUTH_USER_MODEL 설정은 제거합니다 ★★★
# AUTH_USER_MODEL = 'core.User' # 이 줄을 삭제하거나 주석 처리하세요.

LANGUAGE_CODE = 'ko-kr'
TIME_ZONE = 'Asia/Seoul'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.getenv('DRF_PAGE_SIZE', '20')),
}

CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'True').lower() == 'true'
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS_ENV = os.getenv('CORS_ALLOWED_ORIGINS', "http://localhost:3000,http://127.0.0.1:3000,http://0.0.0.0:3000,http://medical-react-frontend:3000,http://react-frontend:3000")
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS_ENV.split(',')]

CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type', 'dnt',
    'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
    'cache-control', 'pragma', 'if-modified-since',
]
CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']
CORS_PREFLIGHT_MAX_AGE = int(os.getenv('CORS_PREFLIGHT_MAX_AGE', '86400'))

CSRF_TRUSTED_ORIGINS_ENV = os.getenv('CSRF_TRUSTED_ORIGINS', "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000")
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in CSRF_TRUSTED_ORIGINS_ENV.split(',')]

OPENMRS_BASE_URL_ENV = os.getenv('OPENMRS_BASE_URL', 'http://openmrs-backend-app:8080/openmrs')
OPENMRS_API_PATH_ENV = os.getenv('OPENMRS_API_PATH', '/ws/rest/v1')
OPENMRS_USERNAME_ENV = os.getenv('OPENMRS_USERNAME', 'admin_fallback')
OPENMRS_PASSWORD_ENV = os.getenv('OPENMRS_PASSWORD', 'Admin123_fallback')

OPENMRS_API_BASE_URL = f"{OPENMRS_BASE_URL_ENV.rstrip('/')}{OPENMRS_API_PATH_ENV.rstrip('/')}"
OPENMRS_USERNAME = OPENMRS_USERNAME_ENV
OPENMRS_PASSWORD = OPENMRS_PASSWORD_ENV

DEFAULT_OPENMRS_SYNC_QUERY = os.getenv('DEFAULT_OPENMRS_SYNC_QUERY', '1000')
OPENMRS_PATIENT_LIST_DEFAULT_LIMIT = int(os.getenv('OPENMRS_PATIENT_LIST_DEFAULT_LIMIT', '50'))

DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID = os.getenv('DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID', "FALLBACK_IDENTIFIER_TYPE_UUID_ERROR")
DEFAULT_OPENMRS_LOCATION_UUID = os.getenv('DEFAULT_OPENMRS_LOCATION_UUID', "FALLBACK_LOCATION_UUID_ERROR")
OPENMRS_PHONE_ATTRIBUTE_TYPE_UUID = os.getenv('OPENMRS_PHONE_ATTRIBUTE_TYPE_UUID', "FALLBACK_PHONE_ATTR_UUID_ERROR")

# ★★★ VitalSigns 관련 Concept/Encounter Type UUID 설정 제거 ★★★
# OPENMRS_VITAL_CONCEPTS = { ... } # 이 부분도 삭제하거나 주석 처리
# OPENMRS_VITALS_ENCOUNTER_TYPE_UUID = '...' # 이 부분도 삭제하거나 주석 처리

print("--- Django Settings Initialized (OpenMRS Configuration) ---")
print(f"BASE_DIR: {BASE_DIR}")
print(f"Loaded .env from: {dotenv_path} (Exists: {os.path.exists(dotenv_path)})")
print(f"SECRET_KEY Loaded: {'Yes' if SECRET_KEY != 'django-insecure-default-key-fallback' else 'No, using fallback'}")
print(f"DEBUG: {DEBUG} (from env: '{DEBUG_ENV}')")
print(f"ALLOWED_HOSTS: {ALLOWED_HOSTS} (from env: '{ALLOWED_HOSTS_ENV}')")
print(f"DB_NAME: {DATABASES['default']['NAME']} (Host: {DATABASES['default']['HOST']})")

print(f"OPENMRS_BASE_URL_ENV: '{OPENMRS_BASE_URL_ENV}'")
print(f"OPENMRS_API_PATH_ENV: '{OPENMRS_API_PATH_ENV}'")
print(f"OPENMRS_USERNAME_ENV: '{OPENMRS_USERNAME_ENV}'")
print(f"OPENMRS_API_BASE_URL (calculated): '{OPENMRS_API_BASE_URL}'")
print(f"DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID: '{DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID}'")
print(f"DEFAULT_OPENMRS_LOCATION_UUID: '{DEFAULT_OPENMRS_LOCATION_UUID}'")
print(f"OPENMRS_PHONE_ATTRIBUTE_TYPE_UUID: '{OPENMRS_PHONE_ATTRIBUTE_TYPE_UUID}'")
# print(f"AUTH_USER_MODEL: '{AUTH_USER_MODEL}'") # ★★★ 이 로깅 줄도 삭제하거나 주석 처리 ★★★
print("------------------------------------------------------------")

CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://redis_fallback:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://redis_fallback:6379/0')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

CELERY_TASK_ROUTES = {
    'ml_models.tasks.predict_complications_task': {'queue': 'ml_predictions'},
    'ml_models.tasks.predict_stroke_mortality_task': {'queue': 'ml_predictions'},
    'ml_models.tasks.assess_sod2_status_task': {'queue': 'maintenance'},
    'ml_models.tasks.cleanup_old_tasks': {'queue': 'maintenance'},
}

CELERY_BEAT_SCHEDULE = {
    'cleanup-old-tasks': {
        'task': 'ml_models.tasks.cleanup_old_tasks',
        'schedule': 86400.0,
    },
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple' if DEBUG else 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'openmrs_integration': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        }
    },
}