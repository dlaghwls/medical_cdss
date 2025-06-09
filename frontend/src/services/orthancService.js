// src/services/orthancService.js

import axios from 'axios';

/**
 * Orthanc 네이티브 REST API를 이용해 DICOM 파일을 업로드합니다.
 * @param {File} dicomFile — 업로드할 DICOM File 객체
 * @returns {Promise<string>} — 생성된 Instance ID(UUID)
 */
export async function uploadDicomToOrthanc(dicomFile) {
  if (!dicomFile) {
    throw new Error('No DICOM file provided for upload.');
  }

  const formData = new FormData();
  formData.append('file', dicomFile, dicomFile.name);

  try {
    // 상대 경로로 요청: setupProxy.js 로 orthanc:8042/instances 로 포워딩됨
    const resp = await axios.post(
      '/instances',
      formData,
      {
        headers: {
          // multipart/form-data 는 브라우저가 boundary까지
          // 자동으로 붙여 주므로 별도 지정 불필요합니다.
        },
      }
    );
    // { ID: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
    return resp.data.ID;
  } catch (err) {
    console.error('[orthancService] DICOM upload 실패:', err);
    throw err;
  }
}

/**
 * QIDO-RS로 환자의 Study 목록을 조회합니다.
 * @param {string} patientId — PatientID(UUID)
 * @returns {Promise<object[]>} — Study 목록 배열
 */
export async function fetchStudiesByPatient(patientId) {
  try {
    const resp = await axios.get(
      '/dicom-web/studies',
      { params: { PatientID: patientId } }
    );
    return resp.data;
  } catch (err) {
    console.error('[orthancService] 스터디 조회 실패:', err);
    throw err;
  }
}
