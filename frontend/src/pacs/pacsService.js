// frontend/src/pacs/pacsService.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// 환자 UUID로 스터디 목록 조회
export async function getStudies(patientUuid) {
  const { data } = await axios.get(
    `${API_BASE}/api/pacs/${patientUuid}/studies/`
  );
  return data;  // data는 배열
}

// DICOM 파일 업로드
export async function uploadDicom(patientUuid, file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axios.post(
    `${API_BASE}/api/pacs/${patientUuid}/upload/`,
    formData,
    { headers: { 'Content-Type':'multipart/form-data' } }
  );
  return data;
}
