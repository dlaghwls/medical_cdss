# backend/ml_models/views.py (새 파일 생성)
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .tasks import predict_complications_task, predict_stroke_mortality_task, assess_sod2_status_task
from .models import PredictionTask
from patients.models import Patient, Visit
from celery.result import AsyncResult
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict_complications(request):
    """합병증 예측 API"""
    try:
        patient_id = request.data.get('patient_id')
        visit_id = request.data.get('visit_id')
        patient_data = request.data.get('patient_data', {})
        
        if not patient_id:
            return Response({'error': '환자 ID가 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 환자 존재 확인
        patient = get_object_or_404(Patient, id=patient_id)
        
        # 비동기 작업 시작
        task = predict_complications_task.delay(patient_id, visit_id, patient_data)
        
        return Response({
            'task_id': task.id,
            'status': 'processing',
            'message': '합병증 예측이 시작되었습니다.',
            'patient': patient.name
        }, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        logger.error(f"합병증 예측 요청 실패: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict_stroke_mortality(request):
    """뇌졸중 사망률 예측 API"""
    try:
        patient_id = request.data.get('patient_id')
        visit_id = request.data.get('visit_id')
        patient_data = request.data.get('patient_data', {})
        
        if not patient_id:
            return Response({'error': '환자 ID가 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)
        
        patient = get_object_or_404(Patient, id=patient_id)
        
        task = predict_stroke_mortality_task.delay(patient_id, visit_id, patient_data)
        
        return Response({
            'task_id': task.id,
            'status': 'processing',
            'message': '사망률 예측이 시작되었습니다.',
            'patient': patient.name
        }, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        logger.error(f"사망률 예측 요청 실패: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assess_sod2_status(request):
    """SOD2 항산화 평가 API"""
    try:
        patient_id = request.data.get('patient_id')
        visit_id = request.data.get('visit_id')
        patient_data = request.data.get('patient_data', {})
        
        if not patient_id:
            return Response({'error': '환자 ID가 필요합니다.'}, status=status.HTTP_400_BAD_REQUEST)
        
        patient = get_object_or_404(Patient, id=patient_id)
        
        task = assess_sod2_status_task.delay(patient_id, visit_id, patient_data)
        
        return Response({
            'task_id': task.id,
            'status': 'processing',
            'message': 'SOD2 항산화 평가가 시작되었습니다.',
            'patient': patient.name
        }, status=status.HTTP_202_ACCEPTED)
        
    except Exception as e:
        logger.error(f"SOD2 평가 요청 실패: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_result(request, task_id):
    """작업 결과 조회 API"""
    try:
        # Celery 결과 확인
        celery_result = AsyncResult(task_id)
        
        # 데이터베이스에서 작업 기록 확인
        try:
            prediction_task = PredictionTask.objects.get(task_id=task_id)
        except PredictionTask.DoesNotExist:
            return Response({'error': '작업을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        
        response_data = {
            'task_id': task_id,
            'status': prediction_task.status.lower(),
            'task_type': prediction_task.task_type,
            'patient': prediction_task.patient.name,
            'created_at': prediction_task.created_at,
            'processing_time': prediction_task.processing_time
        }
        
        if prediction_task.status == 'COMPLETED':
            response_data['results'] = prediction_task.predictions
            response_data['completed_at'] = prediction_task.completed_at
        elif prediction_task.status == 'FAILED':
            response_data['error'] = prediction_task.error_message
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"작업 결과 조회 실패: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_patient_tasks(request, patient_id):
    """환자별 작업 목록 조회"""
    try:
        patient = get_object_or_404(Patient, id=patient_id)
        tasks = PredictionTask.objects.filter(patient=patient).order_by('-created_at')
        
        task_list = []
        for task in tasks:
            task_data = {
                'task_id': str(task.task_id),
                'task_type': task.task_type,
                'status': task.status,
                'created_at': task.created_at,
                'processing_time': task.processing_time
            }
            if task.status == 'COMPLETED':
                task_data['completed_at'] = task.completed_at
            task_list.append(task_data)
        
        return Response({
            'patient': patient.name,
            'tasks': task_list,
            'total_count': len(task_list)
        })
        
    except Exception as e:
        logger.error(f"환자 작업 목록 조회 실패: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)