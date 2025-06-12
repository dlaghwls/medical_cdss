# pacs/views.py

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
import logging
import pydicom # pydicom 라이브러리 임포트
import io      # 메모리 내에서 바이트 스트림을 처리하기 위함
import uuid    # 고유 ID 생성을 위함
from datetime import datetime # 날짜/시간 생성을 위함

# 로거 인스턴스 생성
logger = logging.getLogger(__name__) # __name__은 'pacs.views'가 됩니다.

# settings.py에 정의된 Orthanc 인증 정보
ORTHANC_AUTH = (settings.ORTHANC_USERNAME, settings.ORTHANC_PASSWORD)

class PatientStudiesView(APIView):
    """환자의 Orthanc ID로 촬영(Study) 목록을 조회하는 API"""
    def get(self, request, patient_pacs_id, format=None):
        logger.info(f"PatientStudiesView: GET request received for patient_pacs_id={patient_pacs_id}")

        # Orthanc의 환자별 Study 목록 조회 URL
        orthanc_url = f"{settings.ORTHANC_URL}/patients/{patient_pacs_id}/studies"
        try:
            # Orthanc로 요청 보내기
            response = requests.get(orthanc_url, auth=ORTHANC_AUTH)
            
            # HTTP 오류 발생 시 예외 처리 (4xx, 5xx 등)
            response.raise_for_status() 
            
            logger.info(f"PatientStudiesView: Successfully fetched studies from Orthanc. Status: {response.status_code}")
            return Response(response.json(), status=status.HTTP_200_OK)

        except requests.exceptions.HTTPError as e:
            # Orthanc로부터 HTTP 에러 응답을 받았을 때
            logger.error(f"PatientStudiesView: HTTPError from Orthanc. Status: {e.response.status_code}, Body: {e.response.text}")
            try:
                error_data = e.response.json()
            except ValueError: # Orthanc 응답이 JSON이 아닐 경우
                error_data = {"detail": e.response.text}
            return Response(error_data, status=e.response.status_code)
        except requests.exceptions.ConnectionError as e:
            # Orthanc 서버에 연결할 수 없을 때 (네트워크, URL 오류, 서버 다운 등)
            logger.critical(f"PatientStudiesView: Could not connect to Orthanc at {orthanc_url}. Error: {e}")
            return Response({'error': f'Failed to connect to PACS server: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            # 그 외 모든 예상치 못한 예외 (트레이스백 포함)
            logger.exception("PatientStudiesView: An unexpected error occurred during study retrieval.") 
            return Response({'error': f"An internal server error occurred: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DicomUploadView(APIView):
    """새로운 DICOM 파일을 Orthanc에 업로드하는 API"""
    def post(self, request, format=None):
        logger.info("DicomUploadView: POST request received.")

        file = request.FILES.get('dicom_file')
        if not file:
            logger.warning("DicomUploadView: No 'dicom_file' found in request.FILES.")
            return Response({'error': 'DICOM file not provided'}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"DicomUploadView: Attempting to process file '{file.name}' of size {file.size} bytes.")

        try:
            # 1. 업로드된 파일 내용을 pydicom으로 읽기
            # file.read()는 BytesIO 객체를 반환하거나 파일 내용을 bytes로 반환할 수 있음
            dicom_bytes = file.read()
            dataset = pydicom.dcmread(io.BytesIO(dicom_bytes))
            logger.info(f"DicomUploadView: Successfully read DICOM file with pydicom. Modality: {getattr(dataset, 'Modality', 'N/A')}")

            # 2. 필수 DICOM 태그 자동 생성 및 추가 (누락된 경우)
            # 환자 정보
            if not hasattr(dataset, 'PatientName') or not dataset.PatientName:
                dataset.PatientName = "UNKNOWN^PATIENT"
                logger.info("DicomUploadView: Added default PatientName.")
            
            if not hasattr(dataset, 'PatientID') or not dataset.PatientID:
                # 실제 환자 UUID를 연결하려면 여기서 patient UUID를 가져와 사용해야 합니다.
                # 예: patient_uuid = request.data.get('patient_uuid')
                # 여기서는 임시로 고유한 ID를 생성합니다.
                dataset.PatientID = str(uuid.uuid4())[:8].upper() # 짧은 고유 ID
                logger.info(f"DicomUploadView: Added generated PatientID: {dataset.PatientID}.")
            
            # 스터디 및 시리즈 UID (매우 중요, 고유해야 함)
            if not hasattr(dataset, 'StudyInstanceUID') or not dataset.StudyInstanceUID:
                dataset.StudyInstanceUID = pydicom.uid.generate_uid() # pydicom의 UID 생성기 사용
                logger.info(f"DicomUploadView: Added generated StudyInstanceUID: {dataset.StudyInstanceUID}.")

            if not hasattr(dataset, 'SeriesInstanceUID') or not dataset.SeriesInstanceUID:
                dataset.SeriesInstanceUID = pydicom.uid.generate_uid()
                logger.info(f"DicomUploadView: Added generated SeriesInstanceUID: {dataset.SeriesInstanceUID}.")

            # Modality (영상 종류)
            if not hasattr(dataset, 'Modality') or not dataset.Modality:
                # 파일 확장자나 기타 정보로 유추하거나 기본값 설정
                dataset.Modality = "CT" # 또는 "MR", "US" 등
                logger.info("DicomUploadView: Added default Modality (CT).")

            # Study Date/Time (날짜/시간)
            now = datetime.now()
            if not hasattr(dataset, 'StudyDate') or not dataset.StudyDate:
                dataset.StudyDate = now.strftime('%Y%m%d')
                logger.info(f"DicomUploadView: Added current StudyDate: {dataset.StudyDate}.")
            if not hasattr(dataset, 'StudyTime') or not dataset.StudyTime:
                dataset.StudyTime = now.strftime('%H%M%S.%f')[:-3] # 밀리초까지 포함
                logger.info(f"DicomUploadView: Added current StudyTime: {dataset.StudyTime}.")
            
            # 기타 필요한 태그 (예: SOPInstanceUID도 고유해야 함)
            if not hasattr(dataset, 'SOPInstanceUID') or not dataset.SOPInstanceUID:
                 dataset.SOPInstanceUID = pydicom.uid.generate_uid()
                 logger.info(f"DicomUploadView: Added generated SOPInstanceUID: {dataset.SOPInstanceUID}.")


            # 3. 수정된 DICOM 데이터를 바이트 스트림으로 다시 저장
            modified_dicom_stream = io.BytesIO()
            pydicom.dcmwrite(modified_dicom_stream, dataset)
            modified_dicom_bytes = modified_dicom_stream.getvalue()
            logger.info(f"DicomUploadView: DICOM file modified. New size: {len(modified_dicom_bytes)} bytes.")


            # 4. Orthanc로 전송 (수정된 데이터 사용)
            orthanc_url = f"{settings.ORTHANC_URL}/instances"
            headers = {'Content-Type': 'application/dicom'}

            logger.info(f"DicomUploadView: Sending POST request to Orthanc URL: {orthanc_url}")
            logger.info(f"DicomUploadView: Using Orthanc credentials: {settings.ORTHANC_USERNAME}")

            response = requests.post(orthanc_url, data=modified_dicom_bytes, headers=headers, auth=ORTHANC_AUTH)

            logger.info(f"DicomUploadView: Received response from Orthanc. Status Code: {response.status_code}")
            logger.info(f"DicomUploadView: Orthanc response text: {response.text}")

            response.raise_for_status()

            return Response(response.json(), status=status.HTTP_201_CREATED)

        except pydicom.errors.InvalidDicomError as e:
            logger.error(f"DicomUploadView: Invalid DICOM file received: {e}")
            return Response({'error': f'Invalid DICOM file: {e}'}, status=status.HTTP_400_BAD_REQUEST)
        except requests.exceptions.HTTPError as e:
            logger.error(f"DicomUploadView: HTTPError from Orthanc. Status: {e.response.status_code}, Body: {e.response.text}")
            try:
                error_data = e.response.json()
            except ValueError:
                error_data = {"detail": e.response.text}
            return Response(error_data, status=e.response.status_code)
        except requests.exceptions.ConnectionError as e:
            logger.critical(f"DicomUploadView: Could not connect to Orthanc at {orthanc_url}. Error: {e}")
            return Response({'error': f'Failed to connect to PACS server: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.exception("DicomUploadView: An unexpected error occurred during DICOM upload.")
            return Response({'error': f"An internal server error occurred: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
