# backend/pacs/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('studies/<str:uuid>/', views.get_dicom_studies),
]
