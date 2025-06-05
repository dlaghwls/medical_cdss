from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/ml/", include('ml_models.urls')), 
    path("api/omrs/", include('openmrs_integration.urls')),  # 추가
    path("api/analyze/", include("analyze.urls")), # 추가한 내용
]
