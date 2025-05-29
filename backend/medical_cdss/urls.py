"""
URL configuration for medical_cdss project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

# medical_cdss/urls.py
from django.contrib import admin
from django.urls import path, include # include를 import 했는지 확인

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/omrs/', include('openmrs_integration.urls')), # 새로 추가한 줄
    # 여기에 다른 앱들의 URL 설정이 있을 수 있습니다.
    # 예: path('api/patients/', include('patients.urls')),
]
