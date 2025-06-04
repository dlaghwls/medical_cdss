from django.urls import path
from . import views

urlpatterns = [
    # AI 예측 API들
    path('predict/complications/', views.predict_complications, name='predict_complications'),
    path('predict/mortality/', views.predict_stroke_mortality, name='predict_mortality'),
    path('assess/sod2/', views.assess_sod2_status, name='assess_sod2'),
    
    # 작업 결과 조회
    path('tasks/<str:task_id>/', views.get_task_result, name='get_task_result'),
    path('patients/<int:patient_id>/tasks/', views.list_patient_tasks, name='list_patient_tasks'),
]