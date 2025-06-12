# medical_cdss-happy/backend/medical_cdss/vitals/views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings # settings.py에서 설정 가져오기
import datetime
import pytz # 시간대 처리를 위해
import logging

from .serializers import VitalSignInputSerializer, VitalSignOutputSerializer # 활력 징후 시리얼라이저 임포트
# OpenMRS API 호출 함수 임포트 (openmrs_integration/services.py에서 가져옴)
from openmrs_integration.utils import get_patient_vitals_from_openmrs, create_observation_in_openmrs, create_encounter_in_openmrs, get_provider_uuid_for_user
from core.models import User 
logger = logging.getLogger(__name__)

# 활력 징후 목록 조회 및 생성 API View
class VitalSignsListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated] # 인증된 사용자만 접근 허용
    
    # GET 요청 (특정 환자의 활력 징후 조회)
    def get(self, request, patient_uuid, *args, **kwargs):
        # settings.py의 OPENMRS_VITAL_CONCEPTS에서 모든 Concept UUID 값만 추출
        concept_uuids_to_fetch = list(settings.OPENMRS_VITAL_CONCEPTS.values())

        try:
            # OpenMRS에서 해당 환자의 활력 징후 Observations를 가져옵니다.
            openmrs_vitals = get_patient_vitals_from_openmrs(patient_uuid, concept_uuids=concept_uuids_to_fetch)
            
            # VitalSignOutputSerializer를 사용하여 OpenMRS API 응답을 직렬화합니다.
            # many=True는 여러 개의 객체를 직렬화할 때 사용합니다.
            serializer = VitalSignOutputSerializer(openmrs_vitals, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to fetch vitals for patient {patient_uuid}: {e}", exc_info=True) # exc_info=True로 전체 트레이스백 로깅
            return Response({"error": f"Failed to retrieve vital signs: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # POST 요청 (새로운 활력 징후 생성 및 OpenMRS에 기록)
    def post(self, request, patient_uuid, *args, **kwargs): # URL에서 patient_uuid를 받음
        serializer = VitalSignInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True) # 유효성 검사 실패 시 에러 발생

        # 유효성 검사를 통과한 데이터 추출
        # concept_name은 프론트엔드에서 보낸 Concept 이름 (예: "TEMPERATURE")
        concept_name = serializer.validated_data['concept_name'] 
        value = serializer.validated_data['value']
        obs_datetime = serializer.validated_data['obs_datetime'] # datetime 객체

        # obs_datetime을 OpenMRS가 요구하는 ISO 8601 UTC+0000 형식 문자열로 변환
        # 시간대 정보를 추가하고 UTC로 변환
        if obs_datetime.tzinfo is None:
            # 시간대 정보가 없으면, Django의 TIME_ZONE으로 로컬라이즈 후 UTC로 변환
            local_tz = pytz.timezone(settings.TIME_ZONE)
            obs_datetime = local_tz.localize(obs_datetime).astimezone(pytz.utc)
        else:
            # 이미 시간대 정보가 있다면 UTC로 변환
            obs_datetime = obs_datetime.astimezone(pytz.utc)
        obs_datetime_str = obs_datetime.isoformat(timespec='milliseconds').replace('+00:00', 'Z') # Z는 UTC

        # settings.py의 OPENMRS_VITAL_CONCEPTS에서 해당 concept_name에 맞는 실제 Concept UUID를 가져옵니다.
        # OPENMRS_VITAL_CONCEPTS는 {"TEMPERATURE": "UUID_VALUE", ...} 형태이므로,
        # concept_name (예: "TEMPERATURE")을 키로 직접 사용합니다.
        concept_uuid = settings.OPENMRS_VITAL_CONCEPTS.get(concept_name)

        if not concept_uuid:
            logger.error(f"Concept UUID not found for {concept_name} in settings.OPENMRS_VITAL_CONCEPTS.")
            return Response({"error": f"Concept UUID not found for {concept_name}."}, status=status.HTTP_400_BAD_REQUEST)

        # OpenMRS에서 요구하는 Location UUID (settings에서 가져옴)
        location_uuid = settings.DEFAULT_OPENMRS_LOCATION_UUID

        # 활력 징후를 기록한 제공자(Provider)의 UUID를 가져옵니다 (옵션).
        # 현재 로그인된 Django User의 username을 OpenMRS Provider의 이름으로 가정합니다.
        provider_uuid_for_encounter = None 
        if request.user.is_authenticated and hasattr(request.user, 'username'):
            provider_uuid_for_encounter = get_provider_uuid_for_user(request.user.username)
            if not provider_uuid_for_encounter:
                logger.warning(f"Could not find OpenMRS provider UUID for user {request.user.username}. Encounter will be created without a provider.")

        try:
            # 1. Encounter (만남) 생성
            # OpenMRS_VITALS_ENCOUNTER_TYPE_UUID는 settings.py에서 가져옵니다.
            encounter_type_uuid = settings.OPENMRS_VITALS_ENCOUNTER_TYPE_UUID
            
            # Encounter 시간은 Obs 시간과 동일하게 설정합니다.
            encounter_response = create_encounter_in_openmrs(
                patient_uuid=patient_uuid,
                encounter_type_uuid=encounter_type_uuid,
                encounter_datetime=obs_datetime_str, 
                location_uuid=location_uuid,
                provider_uuid=provider_uuid_for_encounter # 옵션: 제공자 UUID
            )
            encounter_uuid = encounter_response.get('uuid') # 생성된 Encounter의 UUID

            if not encounter_uuid:
                raise Exception("Failed to create encounter in OpenMRS: No UUID returned.")

            # 2. Observation (활력 징후) 생성 및 생성된 Encounter에 연결
            obs_response = create_observation_in_openmrs(
                patient_uuid=patient_uuid,
                concept_uuid=concept_uuid,
                value=value,
                obs_datetime=obs_datetime_str,
                location_uuid=location_uuid,
                encounter_uuid=encounter_uuid # 생성된 Encounter UUID 연결
            )

            return Response(obs_response, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Failed to record vital sign for patient {patient_uuid}, concept {concept_name}: {e}", exc_info=True)
            return Response({"error": f"Failed to record vital sign: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)