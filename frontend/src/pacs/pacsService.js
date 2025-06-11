import axios from 'axios';

// 백엔드 API 주소는 환경 변수 등으로 관리하는 것이 좋습니다.
const API_URL = 'http://localhost:8000/api';

/**
 * 환자의 스터디 목록을 가져오는 함수 (예시)
 * @param {string} patientUuid - 환자 UUID
 */
export const getStudiesForPatient = (patientUuid) => {
  // Orthanc가 아닌 백엔드 API를 호출합니다.
  return axios.get(`${API_URL}/pacs/${patientUuid}/studies/`);
};

/**
 * DICOM 파일을 업로드하는 함수 (예시)
 * @param {string} patientUuid - 환자 UUID
 * @param {File} file - 업로드할 DICOM 파일
 */
export const uploadDicomFile = (patientUuid, file) => {
  const formData = new FormData();
  formData.append('file', file);

  // Orthanc가 아닌 백엔드 API를 호출합니다.
  // (views.py에 upload_dicom 함수에 맞는 URL을 사용해야 합니다.)
  return axios.post(`${API_URL}/pacs/dicom/upload/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};