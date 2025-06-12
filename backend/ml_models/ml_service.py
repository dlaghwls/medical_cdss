# backend/ml_models/ml_service.py - 실제 모델 파일들 기반
import os
import pickle
import numpy as np
import json
import pandas as pd
from django.conf import settings
from django.core.cache import cache
import logging
from typing import Dict, List, Tuple, Any
import time
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)

class MLModelService:
    """머신러닝 모델 서비스 - 실제 pkl 파일 기반"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.preprocessors: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {}
        self.feature_columns: List[str] = []
        self.model_path = os.path.join(settings.BASE_DIR, 'ml_models', 'saved_models')

        # 1) JSON 파일에서 피처 컬럼 목록 로드
        json_path = os.path.join(
            settings.BASE_DIR.parent,
            'frontend', 'src', 'data', 'feature_columns.json'
        )
        try:
            with open(json_path, 'r', encoding='utf-8') as jf:
                self.feature_columns = json.load(jf)
            logger.info(f"Loaded {len(self.feature_columns)} feature columns from {json_path}.")
        except Exception as e:
            logger.error(f"feature_columns JSON 로드 실패: {e}")
            self.feature_columns = []
        self._load_models()

    def _load_models(self):
        try:
        # 오류가 발생해도 Django 시작을 막지 않도록 수정
            logger.info("ML 모델 로드를 시도합니다...")
        # self._load_complication_models()  # 임시 주석 처리
        # self._load_mortality_model()      # 임시 주석 처리
            logger.info("ML 모델 로드를 건너뛰었습니다. (개발 중)")
        except Exception as e:
            logger.warning(f"ML 모델 로드 실패 (무시됨): {e}")
    
    def _load_complication_models(self):
        """합병증 예측 모델들 로드"""
        complications = ['pneumonia', 'acute_kidney_injury', 'heart_failure']
        
        for comp in complications:
            try:
                # 메타데이터 로드
                metadata_path = os.path.join(self.model_path, f'{comp}_metadata.pkl')
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'rb') as f:
                        self.metadata[comp] = pickle.load(f)
                
                # 전처리기 로드  
                preprocessor_path = os.path.join(self.model_path, f'{comp}_preprocessors.pkl')
                if os.path.exists(preprocessor_path):
                    with open(preprocessor_path, 'rb') as f:
                        self.preprocessors[comp] = pickle.load(f)
                
                # 모델 로드
                model_path = os.path.join(self.model_path, f'{comp}_final_model.pkl')
                if os.path.exists(model_path):
                    with open(model_path, 'rb') as f:
                        self.models[comp] = pickle.load(f)
                
                logger.info(f"{comp} 합병증 모델 로드 완료")
                
            except Exception as e:
                logger.error(f"{comp} 모델 로드 실패: {str(e)}")
    
    def _load_mortality_model(self):
        """사망률 예측 모델 로드"""
        try:
            # stroke_mortality_30day.pkl 모델 로드
            mortality_model_path = os.path.join(self.model_path, 'stroke_mortality_30day.pkl')
            if os.path.exists(mortality_model_path):
                with open(mortality_model_path, 'rb') as f:
                    self.models['stroke_mortality'] = pickle.load(f)
                
                # 메타데이터가 별도 파일로 있는 경우
                mortality_metadata_path = os.path.join(self.model_path, 'stroke_mortality_metadata.pkl')
                if os.path.exists(mortality_metadata_path):
                    with open(mortality_metadata_path, 'rb') as f:
                        self.metadata['stroke_mortality'] = pickle.load(f)
                
                # 전처리기가 별도 파일로 있는 경우
                mortality_preprocessor_path = os.path.join(self.model_path, 'stroke_mortality_preprocessors.pkl')
                if os.path.exists(mortality_preprocessor_path):
                    with open(mortality_preprocessor_path, 'rb') as f:
                        self.preprocessors['stroke_mortality'] = pickle.load(f)
                
                logger.info("뇌졸중 사망률 예측 모델 로드 완료")
            
        except Exception as e:
            logger.error(f"사망률 모델 로드 실패: {str(e)}")
    
    def predict_complications(self, patient_data: Dict) -> Dict[str, Any]:
        """합병증 예측 - 실제 모델 사용"""
        start_time = time.time()
        results = {}
        
        try:
            # 입력 데이터 전처리 (183개 피처)
            features_df = self._prepare_features(patient_data)
            
            # 각 합병증 모델로 예측
            for complication in ['pneumonia', 'acute_kidney_injury', 'heart_failure']:
                if complication in self.models:
                    result = self._predict_single_complication(features_df, complication)
                    results[complication] = result
            
            processing_time = time.time() - start_time
            results['processing_time'] = processing_time
            results['timestamp'] = datetime.now().isoformat()
            
            return results
            
        except Exception as e:
            logger.error(f"합병증 예측 중 오류: {str(e)}")
            return {'error': str(e)}
    
    def predict_stroke_mortality(self, patient_data: Dict) -> Dict[str, Any]:
        """뇌졸중 사망률 예측 - stroke_mortality_30day.pkl 사용"""
        start_time = time.time()
        
        try:
            if 'stroke_mortality' not in self.models:
                return {'error': '사망률 예측 모델이 로드되지 않았습니다.'}
            
            # 뇌졸중 특화 피처 준비
            stroke_features = self._prepare_stroke_features(patient_data)
            
            model = self.models['stroke_mortality']
            metadata = self.metadata.get('stroke_mortality', {})
            preprocessors = self.preprocessors.get('stroke_mortality', {})
            
            # 전처리
            if 'imputer' in preprocessors:
                stroke_features = preprocessors['imputer'].transform(stroke_features)
            
            if 'scaler' in preprocessors:
                stroke_features = preprocessors['scaler'].transform(stroke_features)
            
            # 30일 사망률 예측
            if hasattr(model, 'predict_proba'):
                mortality_30_day = model.predict_proba(stroke_features)[0, 1]
            else:
                mortality_30_day = model.predict(stroke_features)[0]
            
            # 위험도 분류
            if mortality_30_day < 0.1:
                risk_level = 'LOW'
            elif mortality_30_day < 0.3:
                risk_level = 'MODERATE'  
            elif mortality_30_day < 0.5:
                risk_level = 'HIGH'
            else:
                risk_level = 'CRITICAL'
            
            # 뇌졸중 특화 분석
            stroke_analysis = self._analyze_stroke_factors(patient_data, mortality_30_day)
            
            result = {
                'mortality_30_day': float(mortality_30_day),
                'risk_level': risk_level,
                'stroke_type': patient_data.get('stroke_type', 'unknown'),
                'nihss_score': patient_data.get('nihss_score'),
                'reperfusion_treatment': patient_data.get('reperfusion_treatment', False),
                'reperfusion_time': patient_data.get('reperfusion_time'),
                'risk_factors': stroke_analysis['risk_factors'],
                'protective_factors': stroke_analysis['protective_factors'],
                'clinical_recommendations': stroke_analysis['recommendations'],
                'model_confidence': float(metadata.get('performance', {}).get('auc', 0.8)),
                'processing_time': time.time() - start_time
            }
            
            return result
            
        except Exception as e:
            logger.error(f"사망률 예측 중 오류: {str(e)}")
            return {'error': str(e)}
    
    def assess_sod2_status(self, patient_data: Dict) -> Dict[str, Any]:
        """SOD2 항산화 평가 - tsx 파일 로직 기반"""
        try:
            # 환자 기본 정보
            age = patient_data.get('age', 65)
            gender = patient_data.get('gender', 'M')
            stroke_type = patient_data.get('stroke_type', 'ischemic_reperfusion')
            stroke_date = patient_data.get('stroke_date')
            nihss_score = patient_data.get('nihss_score', 8)
            reperfusion_treatment = patient_data.get('reperfusion_treatment', True)
            reperfusion_time = patient_data.get('reperfusion_time', 2.5)
            
            # 뇌졸중 후 경과 시간 계산
            if stroke_date:
                if isinstance(stroke_date, str):
                    stroke_date = datetime.strptime(stroke_date, '%Y-%m-%d').date()
                hours_after_stroke = (date.today() - stroke_date).days * 24
            else:
                hours_after_stroke = patient_data.get('hours_after_stroke', 96)
            
            # SOD2 예측 데이터 생성 (tsx 파일 로직)
            sod2_prediction = self._generate_sod2_prediction(
                age, gender, stroke_type, nihss_score, reperfusion_time, hours_after_stroke
            )
            
            # 현재 SOD2 수준
            current_sod2 = sod2_prediction.get('current_level', 0.75)
            
            # 위험도 평가
            if current_sod2 < 0.7:
                risk_level = 'high'
            elif current_sod2 < 0.85:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            # 운동 권장사항 계산
            exercise_rec = self._calculate_exercise_recommendation(
                current_sod2, stroke_type, hours_after_stroke
            )
            
            return {
                'patient_info': {
                    'age': age,
                    'gender': gender,
                    'stroke_type': stroke_type,
                    'nihss_score': nihss_score,
                    'reperfusion_treatment': reperfusion_treatment,
                    'reperfusion_time': reperfusion_time,
                    'hours_after_stroke': hours_after_stroke
                },
                'sod2_status': {
                    'current_level': current_sod2,
                    'oxidative_stress_risk': risk_level,
                    'prediction_confidence': 0.95,
                    'overall_status': self._get_antioxidant_status(current_sod2)
                },
                'sod2_prediction_data': sod2_prediction['time_series'],
                'exercise_recommendations': exercise_rec,
                'clinical_recommendations': self._generate_sod2_recommendations(current_sod2, stroke_type, hours_after_stroke),
                'personalization_factors': {
                    'age_adjustment': 1.0 if 50 <= age <= 70 else 0.9 if age > 70 else 1.1,
                    'stroke_type_adjustment': 0.8 if stroke_type == 'hemorrhagic' else 1.0,
                    'nihss_adjustment': 0.85 if nihss_score > 15 else 1.1 if nihss_score < 5 else 1.0,
                    'reperfusion_timing_adjustment': 1.1 if reperfusion_time <= 3 else 0.95
                }
            }
            
        except Exception as e:
            logger.error(f"SOD2 평가 중 오류: {str(e)}")
            return {'error': str(e)}
    
    def _generate_sod2_prediction(self, age, gender, stroke_type, nihss_score, reperfusion_time, current_hour):
        """SOD2 예측 데이터 생성 - tsx 파일 로직"""
        base_data = [
            {'time': 0, 'predicted': 1.0, 'confidence': 0.95},
            {'time': 3, 'predicted': 0.75, 'confidence': 0.90},
            {'time': 6, 'predicted': 0.6, 'confidence': 0.85},
            {'time': 12, 'predicted': 0.7, 'confidence': 0.88},
            {'time': 24, 'predicted': 0.8, 'confidence': 0.90},
            {'time': 48, 'predicted': 0.9, 'confidence': 0.92},
            {'time': 72, 'predicted': 0.95, 'confidence': 0.94},
            {'time': 96, 'predicted': 0.98, 'confidence': 0.95},
            {'time': 120, 'predicted': 1.0, 'confidence': 0.96},
            {'time': 144, 'predicted': 1.0, 'confidence': 0.97},
            {'time': 168, 'predicted': 1.0, 'confidence': 0.98}
        ]
        
        # 조정 계수들
        age_factor = 0.9 if age > 70 else 1.1 if age < 50 else 1.0
        stroke_factor = 0.8 if stroke_type == 'hemorrhagic' else 0.9 if stroke_type == 'ischemic_no_reperfusion' else 1.0
        nihss_factor = 0.85 if nihss_score > 15 else 1.1 if nihss_score < 5 else 1.0
        reperfusion_factor = 1.1 if reperfusion_time <= 3 else 1.05 if reperfusion_time <= 4.5 else 0.95
        
        total_adjustment = age_factor * stroke_factor * nihss_factor * reperfusion_factor
        
        # 조정된 예측 데이터
        adjusted_data = []
        current_level = None
        
        for point in base_data:
            adjusted_level = min(1.0, point['predicted'] * total_adjustment)
            risk_level = 'high' if adjusted_level < 0.7 else 'medium' if adjusted_level < 0.85 else 'low'
            
            adjusted_point = {
                'time': point['time'],
                'predicted': adjusted_level,
                'confidence': point['confidence'],
                'risk_level': risk_level
            }
            
            if point['time'] == current_hour:
                current_level = adjusted_level
                adjusted_point['actual'] = current_level
            
            adjusted_data.append(adjusted_point)
        
        return {
            'time_series': adjusted_data,
            'current_level': current_level or 0.75
        }
    
    def _calculate_exercise_recommendation(self, sod2_level, stroke_type, hours_after_stroke):
        """운동 권장사항 계산 - tsx 파일 로직"""
        base_recommendations = {
            'ischemic_reperfusion': {'start_time': 72, 'safe_sod2': 0.85},
            'ischemic_no_reperfusion': {'start_time': 96, 'safe_sod2': 0.85},
            'hemorrhagic': {'start_time': 120, 'safe_sod2': 0.8}
        }
        
        recommendation = base_recommendations.get(stroke_type, base_recommendations['ischemic_reperfusion'])
        can_start = hours_after_stroke >= recommendation['start_time'] and sod2_level >= recommendation['safe_sod2']
        
        intensity = 0
        if can_start:
            intensity = min(100, ((sod2_level - recommendation['safe_sod2']) / (1 - recommendation['safe_sod2'])) * 100)
        
        return {
            'can_start': can_start,
            'intensity': round(intensity),
            'time_until_start': max(0, recommendation['start_time'] - hours_after_stroke),
            'sod2_target': recommendation['safe_sod2'],
            'recommended_activities': self._get_exercise_activities(intensity, can_start),
            'monitoring_schedule': '매일 SOD2 수준 확인' if can_start else '24시간 후 재평가'
        }
    
    def _get_exercise_activities(self, intensity, can_start):
        """운동 활동 권장사항"""
        if not can_start:
            return ['안정 가료', '수동적 관절 운동', '호흡 운동']
        
        if intensity < 30:
            return ['침상 내 관절 운동', '호흡 운동', '가벼운 스트레칭']
        elif intensity < 60:
            return ['앉은 자세 운동', '가벼운 보행', '저강도 재활 운동']
        elif intensity < 80:
            return ['보행 훈련', '균형 운동', '중강도 재활 운동']
        else:
            return ['일반 보행', '계단 오르기', '일상생활 동작 훈련']
    
    def _get_antioxidant_status(self, sod2_level):
        """항산화 상태 평가"""
        if sod2_level >= 0.95:
            return "우수"
        elif sod2_level >= 0.85:
            return "양호"
        elif sod2_level >= 0.7:
            return "보통"
        elif sod2_level >= 0.5:
            return "주의"
        else:
            return "위험"
    
    def _generate_sod2_recommendations(self, sod2_level, stroke_type, hours_after_stroke):
        """SOD2 관련 임상 권장사항"""
        recommendations = []
        
        if sod2_level < 0.7:
            recommendations.extend([
                "항산화제 치료 고려",
                "산화 스트레스 모니터링 강화", 
                "운동 제한 및 안정 가료"
            ])
        elif sod2_level < 0.85:
            recommendations.extend([
                "점진적 활동 증가",
                "항산화 식품 섭취 권장",
                "정기적 SOD2 수준 확인"
            ])
        else:
            recommendations.extend([
                "단계적 재활 운동 시작 가능",
                "정상적인 일상 활동 복귀 준비",
                "예방적 항산화 관리"
            ])
        
        if stroke_type == 'hemorrhagic':
            recommendations.append("출혈성 뇌졸중으로 인한 보수적 접근 필요")
        
        return recommendations
    
    def _analyze_stroke_factors(self, patient_data, mortality_probability):
        """뇌졸중 위험 요인 분석"""
        risk_factors = []
        protective_factors = []
        recommendations = []
        
        # 나이
        age = patient_data.get('age', 65)
        if age > 75:
            risk_factors.append(f"고령 ({age}세)")
        elif age < 50:
            protective_factors.append(f"젊은 연령 ({age}세)")
        
        # NIHSS 점수
        nihss = patient_data.get('nihss_score')
        if nihss:
            if nihss > 15:
                risk_factors.append(f"중증 뇌졸중 (NIHSS: {nihss})")
            elif nihss < 5:
                protective_factors.append(f"경증 뇌졸중 (NIHSS: {nihss})")
        
        # 재관류 치료
        if patient_data.get('reperfusion_treatment'):
            reperfusion_time = patient_data.get('reperfusion_time', 0)
            if reperfusion_time <= 3:
                protective_factors.append("조기 재관류 치료")
            elif reperfusion_time > 4.5:
                risk_factors.append("지연된 재관류 치료")
        else:
            risk_factors.append("재관류 치료 미시행")
        
        # 권장사항 생성
        if mortality_probability > 0.5:
            recommendations.extend([
                "집중 모니터링 필요",
                "가족 상담 고려", 
                "완화 치료 계획 수립"
            ])
        elif mortality_probability > 0.3:
            recommendations.extend([
                "적극적 치료 지속",
                "합병증 예방에 집중",
                "정기적 신경학적 평가"
            ])
        else:
            recommendations.extend([
                "표준 치료 프로토콜 적용",
                "재활 치료 계획 수립",
                "퇴원 계획 준비"
            ])
        
        return {
            'risk_factors': risk_factors,
            'protective_factors': protective_factors,
            'recommendations': recommendations
        }
    
    def _prepare_features(self, patient_data: Dict) -> pd.DataFrame:
        """환자 데이터를 183개 피처로 변환"""
        try:
            # 실제 모델에서 사용되는 피처 컬럼들 가져오기
            feature_columns = self._get_feature_columns()
            features = pd.DataFrame(0, index=[0], columns=feature_columns)
            
            # 기본 정보
            if 'gender' in patient_data:
                features.loc[0, 'GENDER'] = 1 if patient_data['gender'] == 'M' else 0
            if 'age' in patient_data:
                features.loc[0, 'AGE'] = patient_data['age']
            
            # 활력징후 매핑
            vital_signs = patient_data.get('vital_signs', {})
            self._map_vital_signs(features, vital_signs)
            
            # 검사결과 매핑  
            lab_results = patient_data.get('lab_results', {})
            self._map_lab_results(features, lab_results)
            
            # 합병증 플래그
            complications = patient_data.get('complications', {})
            self._map_complications(features, complications)
            
            # 약물 플래그
            medications = patient_data.get('medications', {})
            self._map_medications(features, medications)
            
            return features
            
        except Exception as e:
            logger.error(f"피처 준비 중 오류: {str(e)}")
            raise
    
    def _prepare_stroke_features(self, patient_data: Dict) -> pd.DataFrame:
        """뇌졸중 사망률 예측용 피처 준비"""
        # 기본 피처 준비 후 뇌졸중 특화 피처 추가
        features = self._prepare_features(patient_data)
        
        # 뇌졸중 특화 피처들
        if 'nihss_score' in patient_data:
            if 'nihss_score' in features.columns:
                features.loc[0, 'nihss_score'] = patient_data['nihss_score']
        
        if 'stroke_type' in patient_data:
            stroke_type = patient_data['stroke_type']
            if 'stroke_type_ischemic' in features.columns:
                features.loc[0, 'stroke_type_ischemic'] = 1 if 'ischemic' in stroke_type else 0
            if 'stroke_type_hemorrhagic' in features.columns:
                features.loc[0, 'stroke_type_hemorrhagic'] = 1 if 'hemorrhagic' in stroke_type else 0
        
        if 'reperfusion_treatment' in patient_data:
            if 'reperfusion_treatment' in features.columns:
                features.loc[0, 'reperfusion_treatment'] = 1 if patient_data['reperfusion_treatment'] else 0
        
        return features
    
    def _get_feature_columns(self) -> List[str]:
        """모델 피처 컬럼 목록 반환"""
        if self.feature_columns:
            return self.feature_columns
        logger.warning("feature_columns JSON이 비어있습니다. Preprocessor에서 로드된 컬럼 사용.")
        for pre in self.preprocessors.values():
            if isinstance(pre, dict) and 'feature_columns' in pre:
                return pre['feature_columns']
        
        # 기본 183개 피처 (실제로는 업로드된 전처리기에서 가져와야 함)
        return [
            'GENDER', 'AGE',
            # 활력징후 관련 (심박수, 혈압, 체온 등의 통계값들)
            'heart_rate_mean', 'heart_rate_std', 'heart_rate_min', 'heart_rate_max', 'heart_rate_count',
            'heart_rate_first', 'heart_rate_last',
            'systolic_bp_mean', 'systolic_bp_std', 'systolic_bp_min', 'systolic_bp_max', 'systolic_bp_count',
            'systolic_bp_first', 'systolic_bp_last',
            'diastolic_bp_mean', 'diastolic_bp_std', 'diastolic_bp_min', 'diastolic_bp_max', 'diastolic_bp_count',
            'diastolic_bp_first', 'diastolic_bp_last',
            'mean_bp_mean', 'mean_bp_std', 'mean_bp_min', 'mean_bp_max', 'mean_bp_count',
            'mean_bp_first', 'mean_bp_last',
            'temperature_mean', 'temperature_std', 'temperature_min', 'temperature_max', 'temperature_count',
            'temperature_first', 'temperature_last',
            'respiratory_rate_mean', 'respiratory_rate_std', 'respiratory_rate_min', 'respiratory_rate_max',
            'respiratory_rate_count', 'respiratory_rate_first', 'respiratory_rate_last',
            'spo2_mean', 'spo2_std', 'spo2_min', 'spo2_max', 'spo2_count', 'spo2_first', 'spo2_last',
            # ... (실제로는 183개 모든 피처)
            # 검사 결과들
            'wbc_mean', 'wbc_first', 'wbc_last', 'wbc_trend', 'wbc_count',
            'hemoglobin_mean', 'hemoglobin_first', 'hemoglobin_last', 'hemoglobin_trend', 'hemoglobin_count',
            'creatinine_mean', 'creatinine_first', 'creatinine_last', 'creatinine_trend', 'creatinine_count',
            'bun_mean', 'bun_first', 'bun_last', 'bun_trend', 'bun_count',
            # 합병증 플래그들
            'sepsis', 'respiratory_failure', 'deep_vein_thrombosis', 'pulmonary_embolism',
            'urinary_tract_infection', 'gastrointestinal_bleeding',
            # 약물 플래그들  
            'anticoagulant_flag', 'antiplatelet_flag', 'thrombolytic_flag',
            'antihypertensive_flag', 'statin_flag', 'antibiotic_flag', 'vasopressor_flag'
        ]
    
    def _map_vital_signs(self, features: pd.DataFrame, vital_signs: Dict):
        """활력징후 데이터 매핑"""
        vital_mapping = {
            'heart_rate': 'heart_rate_mean',
            'systolic_bp': 'systolic_bp_mean', 
            'diastolic_bp': 'diastolic_bp_mean',
            'temperature': 'temperature_mean',
            'respiratory_rate': 'respiratory_rate_mean',
            'oxygen_saturation': 'spo2_mean'
        }
        
        for key, feature_name in vital_mapping.items():
            if key in vital_signs and feature_name in features.columns:
                features.loc[0, feature_name] = vital_signs[key]
    
    def _map_lab_results(self, features: pd.DataFrame, lab_results: Dict):
        """검사결과 데이터 매핑"""
        lab_mapping = {
            'wbc': 'wbc_mean',
            'hemoglobin': 'hemoglobin_mean',
            'creatinine': 'creatinine_mean',
            'bun': 'bun_mean',
            'glucose': 'glucose_mean',
            'sodium': 'sodium_mean',
            'potassium': 'potassium_mean'
        }
        
        for key, feature_name in lab_mapping.items():
            if key in lab_results and feature_name in features.columns:
                features.loc[0, feature_name] = lab_results[key]
    
    def _map_complications(self, features: pd.DataFrame, complications: Dict):
        """합병증 플래그 매핑"""
        complication_flags = [
            'sepsis', 'respiratory_failure', 'deep_vein_thrombosis',
            'pulmonary_embolism', 'urinary_tract_infection', 'gastrointestinal_bleeding'
        ]
        
        for flag in complication_flags:
            if flag in features.columns:
                features.loc[0, flag] = 1 if complications.get(flag, False) else 0
    
    def _map_medications(self, features: pd.DataFrame, medications: Dict):
        """약물 플래그 매핑"""
        medication_flags = [
            'anticoagulant_flag', 'antiplatelet_flag', 'thrombolytic_flag',
            'antihypertensive_flag', 'statin_flag', 'antibiotic_flag', 'vasopressor_flag'
        ]
        
        for flag in medication_flags:
            if flag in features.columns:
                features.loc[0, flag] = 1 if medications.get(flag, False) else 0
    
    def _predict_single_complication(self, features_df: pd.DataFrame, complication: str) -> Dict:
        """단일 합병증 예측"""
        try:
            model = self.models[complication]
            preprocessors = self.preprocessors[complication]
            metadata = self.metadata[complication]
            
            # 데이터 전처리
            X = features_df.copy()
            
            # 결측치 처리
            if 'imputer' in preprocessors:
                X_imputed = preprocessors['imputer'].transform(X)
                X = pd.DataFrame(X_imputed, columns=X.columns)
            
            # 스케일링
            if 'scaler' in preprocessors:
                X_scaled = preprocessors['scaler'].transform(X)
                X = pd.DataFrame(X_scaled, columns=X.columns)
            
            # 예측
            if hasattr(model, 'predict_proba'):
                probability = model.predict_proba(X)[0, 1]
            else:
                decision_score = model.decision_function(X)[0]
                probability = 1 / (1 + np.exp(-decision_score))
            
            # 임계값 및 위험도
            threshold = metadata.get('threshold', 0.5)
            prediction = probability > threshold
            
            if probability < 0.3:
                risk_level = 'LOW'
            elif probability < 0.7:
                risk_level = 'MEDIUM'
            else:
                risk_level = 'HIGH'
            
            # 모델 성능 정보
            performance = metadata.get('performance', {})
            
            return {
                'probability': float(probability),
                'prediction': bool(prediction),
                'risk_level': risk_level,
                'threshold': float(threshold),
                'model_performance': {
                    'auc': float(performance.get('auc', 0)),
                    'precision': float(performance.get('precision', 0)),
                    'recall': float(performance.get('recall', 0)),
                    'f1': float(performance.get('f1', 0))
                },
                'model_info': {
                    'type': metadata.get('model_type', 'Unknown'),
                    'strategy': metadata.get('strategy', 'Unknown'),
                    'training_date': metadata.get('training_date', 'Unknown'),
                    'feature_count': metadata.get('feature_count', 183)
                }
            }
            
        except Exception as e:
            logger.error(f"{complication} 예측 중 오류: {str(e)}")
            return {'error': str(e)}

# 싱글톤 인스턴스
ml_service = MLModelService()