# medical_cdss-happy/backend/medical_cdss/vitals/serializers.py

from rest_framework import serializers
from django.conf import settings # settings.py에서 설정 가져오기
import datetime
import pytz # 시간대 처리를 위해 (날짜/시간 관련)

# --- Input Serializer for submitting vitals ---
# 프론트엔드로부터 받을 활력 징후 데이터의 유효성을 검사합니다.
class VitalSignInputSerializer(serializers.Serializer):
    patient_uuid = serializers.UUIDField(required=True) # 환자 UUID
    concept_name = serializers.CharField(required=True) # 활력 징후 개념 이름 (예: "TEMPERATURE", "BP_SYSTOLIC")
    value = serializers.FloatField(required=True) # 측정 수치
    # 측정 날짜/시간 (프론트엔드에서 ISO 8601 형식으로 보낼 것으로 가정)
    obs_datetime = serializers.DateTimeField(required=True, format="%Y-%m-%dT%H:%M:%S") 

    def validate_concept_name(self, value):
        # settings.OPENMRS_VITAL_CONCEPTS 딕셔너리에 정의된 개념 이름과 일치하는지 확인합니다.
        # settings 딕셔너리는 {"KEY_NAME": "UUID_VALUE"} 형태이므로, 
        # KEY_NAME에서 '_UUID'를 제거하고 대문자로 변환한 값과 비교합니다.
        
        # 예: settings.OPENMRS_VITAL_CONCEPTS = {"TEMPERATURE": "uuid_val_temp"}
        # 프론트엔드에서 보낸 'TEMPERATURE'와 일치하는지 확인.
        
        # settings.py의 OPENMRS_VITAL_CONCEPTS 딕셔너리 키를 Concept Name으로 그대로 사용하는 경우
        if value.upper() not in settings.OPENMRS_VITAL_CONCEPTS:
            raise serializers.ValidationError(f"Invalid concept name: {value}. Must be one of {list(settings.OPENMRS_VITAL_CONCEPTS.keys())}")
        return value.upper() # 대문자로 변환하여 반환 (views.py에서 UUID 조회 시 사용)

    def validate(self, data):
        # obs_datetime이 UTC+0000이 아니라면 변환 (옵션, OpenMRS는 UTC를 선호)
        # if data['obs_datetime'].tzinfo is None:
        #     # 시간대가 없는 경우 UTC로 가정하거나, Django TIME_ZONE으로 변환
        #     data['obs_datetime'] = pytz.timezone(settings.TIME_ZONE).localize(data['obs_datetime'])
        # data['obs_datetime'] = data['obs_datetime'].astimezone(pytz.utc)
        
        # 현재는 프론트에서 ISO 8601 문자열을 보내고 백엔드에서 DateTimeField로 받으므로 Django가 자동 처리
        return data

# --- Output Serializer for displaying vitals fetched from OpenMRS ---
# OpenMRS에서 가져온 활력 징후 데이터를 프론트엔드에 맞게 직렬화합니다.
class VitalSignOutputSerializer(serializers.Serializer):
    uuid = serializers.UUIDField(source='uuid') # Obs의 UUID
    concept_uuid = serializers.CharField(source='concept.uuid') # Obs 개념의 UUID
    concept_name = serializers.CharField(source='concept.display') # Obs 개념의 표시 이름 (예: "BODY TEMPERATURE")
    value = serializers.SerializerMethodField() # 측정 수치 (float으로 변환)
    obs_datetime = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S") # 측정 날짜/시간
    comment = serializers.CharField(source='comment', allow_blank=True, required=False) # OpenMRS의 comment 필드

    def get_value(self, obj):
        # OpenMRS Obs API는 value를 다양한 타입으로 반환할 수 있으므로, float으로 강제 변환 시도
        try:
            return float(obj.get('value'))
        except (ValueError, TypeError):
            return None