# medical_cdss-happy/backend/medical_cdss/vitals/urls.py

from django.urls import path
from .views import VitalSignsListCreateView

urlpatterns = [
    # 특정 환자의 활력 징후 목록 조회 (GET) 및 생성 (POST) 엔드포인트
    # URL 형식: /api/vitals/<patient_uuid>/
    path('<uuid:patient_uuid>/', VitalSignsListCreateView.as_view(), name='vital-signs-list-create'),
]