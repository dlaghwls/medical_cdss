# backend/ml_models/admin.py (새 파일 생성)
# ================================
from django.contrib import admin
from .models import PredictionTask

@admin.register(PredictionTask)
class PredictionTaskAdmin(admin.ModelAdmin):
    list_display = ['task_id', 'patient', 'task_type', 'status', 'created_at', 'processing_time']
    list_filter = ['task_type', 'status', 'created_at']
    search_fields = ['task_id', 'patient__name', 'patient__patient_id']
    readonly_fields = ['task_id', 'created_at', 'completed_at', 'processing_time']
    
    fieldsets = (
        ('기본정보', {
            'fields': ('task_id', 'patient', 'visit', 'task_type', 'status', 'requested_by')
        }),
        ('입력/결과', {
            'fields': ('input_data', 'predictions', 'error_message')
        }),
        ('시간정보', {
            'fields': ('created_at', 'completed_at', 'processing_time')
        }),
    )
