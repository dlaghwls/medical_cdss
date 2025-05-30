# medical_cdss/settings.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file (if you are using one)
load_dotenv() 

# SECURITY WARNING: keep the secret key used in production secret!
# .env 파일에서 SECRET_KEY를 가져오거나, 없으면 Django가 자동으로 생성한 키 또는 개발용 임시 키 사용
# 실제 배포 시에는 반드시 안전한 고유 키로 설정해야 합니다.
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-a_very_secure_default_key_for_development_only_12345')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() == 'true'

# ALLOWED_HOSTS: 환경 변수에서 가져오거나, 개발 시에는 localhost, 127.0.0.1을 기본으로 사용
ALLOWED_HOSTS_STR = os.getenv('DJANGO_ALLOWED_HOSTS')
ALLOWED_HOSTS = ALLOWED_HOSTS_STR.split(',') if ALLOWED_HOSTS_STR else ['localhost', '127.0.0.1']


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',       # Django REST framework
    'corsheaders',          # CORS (Cross-Origin Resource Sharing) 처리
    # 'django_celery_beat',    # <--- Celery 사용 안 하므로 제거 또는 주석 처리
    # 'django_celery_results', # <--- Celery 사용 안 하므로 제거 또는 주석 처리
    
    # Local apps (앱 Config 클래스 사용 권장)
    'core.apps.CoreConfig', 
    'patients.apps.PatientsConfig',
    'visits.apps.VisitsConfig',
    'diagnoses.apps.DiagnosesConfig',
    'cdss.apps.CdssConfig',
    'ml_models.apps.MlModelsConfig',
    'openmrs_integration.apps.OpenmrsIntegrationConfig', # openmrs_integration 앱은 하나만 등록
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # 가능한 한 상단에 위치
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'medical_cdss.urls' # medical_cdss는 Django 프로젝트 이름

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'], # 프로젝트 레벨 템플릿 폴더 (필요시)
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

WSGI_APPLICATION = 'medical_cdss.wsgi.application' # medical_cdss는 Django 프로젝트 이름


# Database
# https://docs.djangoproject.com/en/dev/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'medical_cdss'),         # docker-compose.yml의 POSTGRES_DB
        'USER': os.getenv('DB_USER', 'medical_user'),         # docker-compose.yml의 POSTGRES_USER
        'PASSWORD': os.getenv('DB_PASSWORD', 'medical_pass123'), # docker-compose.yml의 POSTGRES_PASSWORD
        'HOST': os.getenv('DB_HOST', 'localhost'),            # Django를 로컬에서 직접 실행 시 'localhost' 또는 '127.0.0.1'
                                                              # Django가 Docker 컨테이너 내부에서 실행된다면 'medical-postgres' (서비스 이름)
        'PORT': os.getenv('DB_PORT', '5432'),                 # PostgreSQL 기본 포트
    }
}


# Password validation
# https://docs.djangoproject.com/en/dev/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]


# Internationalization
# https://docs.djangoproject.com/en/dev/topics/i18n/
LANGUAGE_CODE = 'ko-kr'
TIME_ZONE = 'Asia/Seoul'
USE_I18N = True
USE_TZ = True # 시간대 관련 처리를 위해 True 권장


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/dev/howto/static-files/
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles' # 배포 시 정적 파일이 모이는 경로

# Media files (사용자가 업로드하는 파일)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'mediafiles' # MEDIA_ROOT는 STATIC_ROOT와 다른 경로로 설정


# Default primary key field type
# https://docs.djangoproject.com/en/dev/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication', # Token 기반 인증 사용 시
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        # 개발 초기에는 AllowAny로 설정하여 인증 없이 테스트 용이하게 할 수 있습니다.
        # 'rest_framework.permissions.AllowAny', 
        'rest_framework.permissions.IsAuthenticated', # 기본적으로 인증된 사용자만 접근 허용
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20, # 한 페이지에 보여줄 아이템 수
}


# CORS (Cross-Origin Resource Sharing) settings
# React 개발 서버 주소 (예: http://localhost:3000 또는 3001 등)
CORS_ALLOWED_ORIGINS_STR = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001')
CORS_ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS_STR.split(',') if CORS_ALLOWED_ORIGINS_STR else []

CORS_ALLOW_CREDENTIALS = True # 쿠키 등 자격 증명 허용 여부


# # Celery Configuration (Celery 사용 안 하므로 주석 처리 또는 삭제)
# REDIS_HOST = os.getenv('REDIS_HOST', 'localhost') # Django 로컬 실행, Redis Docker 가정
# REDIS_PORT = os.getenv('REDIS_PORT', '6379')
# CELERY_BROKER_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}/0'
# CELERY_RESULT_BACKEND = f'redis://{REDIS_HOST}:{REDIS_PORT}/0'
# CELERY_ACCEPT_CONTENT = ['json']
# CELERY_TASK_SERIALIZER = 'json'
# CELERY_RESULT_SERIALIZER = 'json'
# CELERY_TIMEZONE = TIME_ZONE
# CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
# CELERY_BEAT_SCHEDULE = {
#     'sync-openmrs-patients-every-10-minutes': {
#         'task': 'openmrs_integration.tasks.run_sync_openmrs_patients_command_task',
#         'schedule': crontab(minute='*/10'), 
#         'kwargs': {'query_term': "1000", 'limit': 50, 'max_patients': 200} 
#     },
# }


# OpenMRS Configuration
OPENMRS_BASE_URL_ENV = os.getenv('OPENMRS_BASE_URL', 'http://localhost:8080/openmrs')
OPENMRS_API_PATH_ENV = os.getenv('OPENMRS_API_PATH', '/ws/rest/v1')
OPENMRS_USERNAME_ENV = os.getenv('OPENMRS_USERNAME', 'admin') # 환경 변수명 일관성
OPENMRS_PASSWORD_ENV = os.getenv('OPENMRS_PASSWORD', 'Admin123') # 환경 변수명 일관성

# settings 모듈 내에서 사용할 최종 변수 (views.py 등에서 import settings 후 settings.OPENMRS_API_BASE_URL 등으로 사용)
OPENMRS_API_BASE_URL = f"{OPENMRS_BASE_URL_ENV.rstrip('/')}{OPENMRS_API_PATH_ENV.rstrip('/')}"
OPENMRS_USERNAME = OPENMRS_USERNAME_ENV
OPENMRS_PASSWORD = OPENMRS_PASSWORD_ENV

DEFAULT_OPENMRS_SYNC_QUERY = os.getenv('DEFAULT_OPENMRS_SYNC_QUERY', '1000')
OPENMRS_PATIENT_LIST_DEFAULT_LIMIT = int(os.getenv('OPENMRS_PATIENT_LIST_DEFAULT_LIMIT', '50'))

# OpenMRS 환자 등록 시 사용할 기본 Identifier Type 및 Location UUID (views.py에서 사용)
# 이 값들은 실제 OpenMRS 시스템에서 확인하고 .env 파일에 설정하거나 여기에 직접 입력해야 합니다.
DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID = os.getenv('DEFAULT_OPENMRS_IDENTIFIER_TYPE_UUID', "05a29f94-c0ed-11e2-94be-8c13b969e334") 
DEFAULT_OPENMRS_LOCATION_UUID = os.getenv('DEFAULT_OPENMRS_LOCATION_UUID', "8d6c993e-c2cc-11de-8d13-0010c6dffd0f")