# backend/pacs/views.py

import requests
import traceback  # 누락되었던 import 문
from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status

ORTHANC_URL = getattr(settings, 'ORTHANC_URL', 'http://orthanc:8042')

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def get_studies(request, patient_uuid):
    # Orthanc 접속 코드를 모두 제거하고, 무조건 성공 응답을 보내는 테스트
    print("!!!!!!!!!! RUNNING THE 'ALWAYS SUCCESS' TEST VIEW !!!!!!!!!!")

    # 실제 Orthanc 응답과 유사한 가짜 데이터를 만듭니다.
    fake_studies_data = [
      {
        "ID": "fake-study-id-12345",
        "PatientID": patient_uuid,
        "StudyDate": "20250611",
        "StudyDescription": "Test Study - Connection OK"
      }
    ]
    
    return JsonResponse(fake_studies_data, safe=False, status=200)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def upload_dicom(request, patient_uuid):
    """클라이언트에서 받은 DICOM 파일을 Orthanc에 등록"""
    file_obj = request.FILES.get('file')
    if not file_obj:
        return JsonResponse({'error': '파일 누락'}, status=status.HTTP_400_BAD_REQUEST)

    files = {'file': (file_obj.name, file_obj.read(), file_obj.content_type)}
    inst_url = f"{ORTHANC_URL}/instances"

    try:
        resp = requests.post(
            inst_url,
            files=files,
            # auth=('orthanc', 'orthanc') # ★★★ 업로드 시에도 인증 코드 추가 ★★★
        )
        resp.raise_for_status()
        return JsonResponse({'message': '업로드 성공', 'data': resp.json()}, status=status.HTTP_201_CREATED)
    except requests.RequestException as e:
        traceback.print_exc()
        return JsonResponse(
            {'error': 'Orthanc 업로드 실패', 'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )