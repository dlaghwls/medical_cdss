import axios from 'axios';

const ORTHANC_URL = 'http://localhost:8042';

export const uploadDicomFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(`${ORTHANC_URL}/instances`, formData, {
      headers: {
        'Accept': 'application/json',
        // 'Content-Type': 제거해야 함 (FormData로 자동 설정됨)
      },
      withCredentials: false  // 인증 끈 상태에서는 false
    });

    console.log('[Orthanc] 업로드 성공:', response.data);
    return response.data;
  } catch (error) {
    console.error('[Orthanc] 업로드 실패:', error.response || error.message);
    throw error;
  }
};
