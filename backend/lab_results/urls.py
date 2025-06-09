# backend/lab_results/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LabResultViewSet

router = DefaultRouter()
router.register(r'', LabResultViewSet) # /api/lab-results/ 와 /api/lab-results/<pk>/ 등의 기본 CRUD URL 생성

urlpatterns = [
    path('', include(router.urls)),
    # 특정 환자의 LIS 결과만 조회하는 URL (쿼리 파라미터 방식)
    path('by-patient/', LabResultViewSet.as_view({'get': 'by_patient'}), name='lab_results_by_patient_query'),
    # 참고: /api/lab-results/by-patient/ 가 됩니다.
]