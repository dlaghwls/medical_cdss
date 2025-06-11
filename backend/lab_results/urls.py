# backend/lab_results/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LabResultViewSet, StrokeInfoHistoryView, ComplicationsHistoryView

router = DefaultRouter()
router.register(r'', LabResultViewSet) # /api/lab-results/ 와 /api/lab-results/<pk>/ 등의 기본 CRUD URL 생성

urlpatterns = [
    path('stroke-info/', StrokeInfoHistoryView.as_view(), name='stroke-info-history'),
    path('complications-medications/', ComplicationsHistoryView.as_view(), name='complications-history'),
    path('by-patient/', LabResultViewSet.as_view({'get': 'by_patient'}), name='lab_results_by_patient_query'),
    path('', include(router.urls)),
]