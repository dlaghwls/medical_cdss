from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/ml/", include('ml_models.urls')), 
    path("api/omrs/", include('openmrs_integration.urls')),  # 추가
    path("api/analyze/", include("analyze.urls")), # 추가한 내용
    path('api/lab-results/', include('lab_results.urls')),
    path('api/chat/', include('chat.urls')), 
    path('api/auth/login/', obtain_auth_token, name='api_token_auth'),
    path('api/vitals/', include('vitals.urls')),
]

