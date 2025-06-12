# pacs/urls.py

from django.urls import path
from .views import PatientStudiesView, DicomUploadView

urlpatterns = [
    # GET api/pacs/patients/{patient_pacs_id}/studies/
    path('patients/<str:patient_pacs_id>/studies/', PatientStudiesView.as_view(), name='pacs-get-studies'),

    # POST api/pacs/upload/
    path('upload/', DicomUploadView.as_view(), name='pacs-upload-dicom'),
]