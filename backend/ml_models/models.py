# backend/ml_models/models.py (새 파일 생성)
from django.db import models
import uuid
from django.contrib.auth.models import User

class PredictionTask(models.Model):
    """AI 예측 작업 기록"""
    TASK_TYPE_CHOICES = [
        ('COMPLICATION', '합병증 예측'),
        ('MORTALITY', '사망률 예측'),
        ('SOD2_ASSESSMENT', 'SOD2 항산화 평가'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', '대기중'),
        ('PROCESSING', '처리중'),
        ('COMPLETED', '완료'),
        ('FAILED', '실패'),
    ]
    
    task_id = models.UUIDField(unique=True, verbose_name="Celery 작업 ID")
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, verbose_name="환자")
    visit = models.ForeignKey('patients.Visit', on_delete=models.CASCADE, verbose_name="방문", null=True, blank=True)
    task_type = models.CharField(max_length=30, choices=TASK_TYPE_CHOICES, verbose_name="작업 유형")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name="상태")
    
    input_data = models.JSONField(verbose_name="입력 데이터")
    predictions = models.JSONField(null=True, blank=True, verbose_name="예측 결과")
    
    processing_time = models.FloatField(null=True, blank=True, verbose_name="처리 시간(초)")
    error_message = models.TextField(blank=True, verbose_name="오류 메시지")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="완료일")
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="요청자")
    
    class Meta:
        verbose_name = "AI 예측 작업"
        verbose_name_plural = "AI 예측 작업"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_task_type_display()} - {self.patient.name} ({self.status})"