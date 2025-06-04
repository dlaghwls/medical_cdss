# backend/ml_models/tasks.py
from celery import shared_task
from django.utils import timezone
from .ml_service import ml_service
from .models import PredictionTask, ComplicationPrediction, StrokeMortalityPrediction, SOD2Assessment
from patients.models import Patient, Visit
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def predict_complications_task(self, patient_id, visit_id, input_data):
    """합병증 예측 비동기 태스크"""
    task_id = self.request.id
    
    try:
        # 환자와 방문 정보 가져오기
        patient = Patient.objects.get(id=patient_id)
        visit = Visit.objects.get(id=visit_id) if visit_id else None
        
        # 예측 작업 기록 생성
        prediction_task = PredictionTask.objects.create(
            task_id=task_id,
            patient=patient,
            visit=visit,
            task_type='COMPLICATION',
            status='PROCESSING',
            input_data=input_data
        )
        
        # ML 서비스로 예측 실행
        start_time = timezone.now()
        results = ml_service.predict_complications(input_data)
        processing_time = (timezone.now() - start_time).total_seconds()
        
        if 'error' in results:
            prediction_task.status = 'FAILED'
            prediction_task.error_message = results['error']
            prediction_task.save()
            return {'error': results['error']}
        
        # 결과 저장
        prediction_task.predictions = results
        prediction_task.processing_time = processing_time
        prediction_task.status = 'COMPLETED'
        prediction_task.completed_at = timezone.now()
        prediction_task.save()
        
        # 각 합병증별 상세 결과 저장
        for complication, result in results.items():
            if complication not in ['processing_time', 'timestamp']:
                ComplicationPrediction.objects.create(
                    task=prediction_task,
                    complication_type=complication,
                    probability=result.get('probability', 0),
                    risk_level=result.get('risk_level', 'LOW'),
                    threshold=result.get('threshold', 0.5),
                    model_auc=result.get('model_performance', {}).get('auc', 0),
                    model_precision=result.get('model_performance', {}).get('precision', 0),
                    model_recall=result.get('model_performance', {}).get('recall', 0),
                    model_f1=result.get('model_performance', {}).get('f1', 0),
                    model_type=result.get('model_info', {}).get('type', 'Unknown'),
                    model_strategy=result.get('model_info', {}).get('strategy', 'Unknown'),
                    important_features=result.get('important_features', [])
                )
        
        logger.info(f"합병증 예측 완료: Task {task_id}, Patient {patient.name}")
        return {
            'task_id': task_id,
            'status': 'completed',
            'results': results,
            'processing_time': processing_time
        }
        
    except Exception as e:
        logger.error(f"합병증 예측 실패: {str(e)}")
        if 'prediction_task' in locals():
            prediction_task.status = 'FAILED'
            prediction_task.error_message = str(e)
            prediction_task.save()
        return {'error': str(e)}

@shared_task(bind=True)
def predict_stroke_mortality_task(self, patient_id, visit_id, input_data):
    """뇌졸중 사망률 예측 비동기 태스크"""
    task_id = self.request.id
    
    try:
        patient = Patient.objects.get(id=patient_id)
        visit = Visit.objects.get(id=visit_id) if visit_id else None
        
        prediction_task = PredictionTask.objects.create(
            task_id=task_id,
            patient=patient,
            visit=visit,
            task_type='MORTALITY',
            status='PROCESSING',
            input_data=input_data
        )
        
        start_time = timezone.now()
        result = ml_service.predict_stroke_mortality(input_data)
        processing_time = (timezone.now() - start_time).total_seconds()
        
        if 'error' in result:
            prediction_task.status = 'FAILED'
            prediction_task.error_message = result['error']
            prediction_task.save()
            return {'error': result['error']}
        
        prediction_task.predictions = result
        prediction_task.processing_time = processing_time
        prediction_task.status = 'COMPLETED'
        prediction_task.completed_at = timezone.now()
        prediction_task.save()
        
        # 사망률 예측 상세 결과 저장
        StrokeMortalityPrediction.objects.create(
            task=prediction_task,
            mortality_30_day=result.get('mortality_30_day', 0),
            mortality_30_day_risk_level=result.get('risk_level', 'LOW'),
            stroke_type=result.get('stroke_type', 'unknown'),
            nihss_score=result.get('nihss_score'),
            reperfusion_treatment=result.get('reperfusion_treatment', False),
            reperfusion_time=result.get('reperfusion_time'),
            risk_factors=result.get('risk_factors', []),
            protective_factors=result.get('protective_factors', []),
            model_confidence=result.get('model_confidence', 0.8),
            model_auc=result.get('model_confidence', 0.8),  # 임시
            clinical_recommendations='\n'.join(result.get('clinical_recommendations', [])),
            monitoring_priority=result.get('risk_level', 'LOW')
        )
        
        logger.info(f"사망률 예측 완료: Task {task_id}, Patient {patient.name}")
        return {
            'task_id': task_id,
            'status': 'completed',
            'result': result,
            'processing_time': processing_time
        }
        
    except Exception as e:
        logger.error(f"사망률 예측 실패: {str(e)}")
        if 'prediction_task' in locals():
            prediction_task.status = 'FAILED'
            prediction_task.error_message = str(e)
            prediction_task.save()
        return {'error': str(e)}

@shared_task(bind=True)
def assess_sod2_status_task(self, patient_id, visit_id, input_data):
    """SOD2 항산화 평가 비동기 태스크"""
    task_id = self.request.id
    
    try:
        patient = Patient.objects.get(id=patient_id)
        visit = Visit.objects.get(id=visit_id) if visit_id else None
        
        prediction_task = PredictionTask.objects.create(
            task_id=task_id,
            patient=patient,
            visit=visit,
            task_type='SOD2_ASSESSMENT',
            status='PROCESSING',
            input_data=input_data
        )
        
        start_time = timezone.now()
        result = ml_service.assess_sod2_status(input_data)
        processing_time = (timezone.now() - start_time).total_seconds()
        
        if 'error' in result:
            prediction_task.status = 'FAILED'
            prediction_task.error_message = result['error']
            prediction_task.save()
            return {'error': result['error']}
        
        prediction_task.predictions = result
        prediction_task.processing_time = processing_time
        prediction_task.status = 'COMPLETED'
        prediction_task.completed_at = timezone.now()
        prediction_task.save()
        
        # SOD2 평가 상세 결과 저장
        patient_info = result['patient_info']
        sod2_status = result['sod2_status']
        exercise_rec = result['exercise_recommendations']
        
        SOD2Assessment.objects.create(
            task=prediction_task,
            age=patient_info['age'],
            gender=patient_info['gender'],
            stroke_type=patient_info['stroke_type'],
            stroke_date=datetime.now().date(),  # 실제로는 input_data에서 파싱
            nihss_score=patient_info['nihss_score'],
            reperfusion_treatment=patient_info['reperfusion_treatment'],
            reperfusion_time=patient_info.get('reperfusion_time'),
            hours_after_stroke=patient_info['hours_after_stroke'],
            current_sod2_level=sod2_status['current_level'],
            sod2_prediction_data=result['sod2_prediction_data'],
            oxidative_stress_risk=sod2_status['oxidative_stress_risk'],
            prediction_confidence=sod2_status['prediction_confidence'],
            exercise_can_start=exercise_rec['can_start'],
            exercise_intensity=exercise_rec['intensity'],
            exercise_start_time=exercise_rec.get('time_until_start'),
            sod2_target_level=exercise_rec['sod2_target'],
            age_adjustment_factor=result['personalization_factors']['age_adjustment'],
            stroke_type_adjustment=result['personalization_factors']['stroke_type_adjustment'],
            nihss_adjustment=result['personalization_factors']['nihss_adjustment'],
            reperfusion_timing_adjustment=result['personalization_factors']['reperfusion_timing_adjustment'],
            clinical_recommendations='\n'.join(result['clinical_recommendations']),
            exercise_recommendations='\n'.join(exercise_rec['recommended_activities']),
            monitoring_schedule=exercise_rec['monitoring_schedule']
        )
        
        logger.info(f"SOD2 평가 완료: Task {task_id}, Patient {patient.name}")
        return {
            'task_id': task_id,
            'status': 'completed',
            'result': result,
            'processing_time': processing_time
        }
        
    except Exception as e:
        logger.error(f"SOD2 평가 실패: {str(e)}")
        if 'prediction_task' in locals():
            prediction_task.status = 'FAILED'
            prediction_task.error_message = str(e)
            prediction_task.save()
        return {'error': str(e)}

@shared_task
def cleanup_old_tasks():
    """오래된 예측 작업 정리"""
    from datetime import timedelta
    cutoff_date = timezone.now() - timedelta(days=30)
    
    deleted_count = PredictionTask.objects.filter(
        created_at__lt=cutoff_date,
        status__in=['COMPLETED', 'FAILED']
    ).delete()[0]
    
    logger.info(f"정리된 오래된 작업 수: {deleted_count}")
    return deleted_count

# ================================
