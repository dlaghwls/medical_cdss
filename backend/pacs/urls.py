# backend/pacs/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # 환자 UUID로 스터디 목록 조회 (QIDO-RS)
    path('api/pacs/<str:patient_uuid>/studies/', views.get_studies, name='pacs-get-studies'),
    # 환자 UUID로 DICOM 인스턴스 업로드
    path('api/pacs/<str:patient_uuid>/upload/', views.upload_dicom, name='pacs-upload-dicom'),
]
