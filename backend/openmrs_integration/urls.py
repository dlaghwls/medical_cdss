# # openmrs_integration/urls.py
# from django.urls import path
# from . import views

# app_name = 'openmrs_integration' # 앱 네임스페이스 (선택 사항이지만 권장)

# urlpatterns = [
#     path('patients/', views.get_openmrs_patients_list, name='omrs_patient_list'),
#     path('patient/<uuid:patient_uuid>/', views.get_openmrs_patient_detail, name='omrs_patient_detail'),
# ]

# openmrs_integration/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # 이전: path('patients/', views.get_openmrs_patients_list, name='omrs_patients_list'),
    path('patients/', views.get_django_patients_list, name='django_patients_list'), # 함수 이름 변경
    path('patients/<str:patient_uuid>/', views.get_openmrs_patient_detail, name='omrs_patient_detail'),
]