import axios from 'axios';

// Docker 환경에서는 proxy 대신 직접 백엔드 주소 사용
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/omrs', // Django 백엔드 직접 연결
  headers: {
    'Content-Type': 'application/json',
    // Django API가 인증을 요구한다면 여기에 해당 헤더를 추가해야 합니다.
    // 예: DRF TokenAuthentication 사용 시
    // 'Authorization': `Token YOUR_DJANGO_API_TOKEN_HERE`, 
  },
});

/**
 * Django 로컬 데이터베이스에서만 환자 목록을 조회합니다.
 */
export const fetchLocalPatients = async (query = '') => {
  try {
    let requestUrl = `/patients/local-list/?`; // Django urls.py에 정의된 경로
    const params = new URLSearchParams();
    if (query) {
      params.append('q', query);
    }
    // 필요하다면 페이징 파라미터도 추가할 수 있습니다.
    // params.append('limit', '20'); 
    // params.append('startIndex', '0');
    
    const fullRequestUrl = `${requestUrl}${params.toString()}`;
    console.log(`Requesting Django API (fetchLocalPatients): ${apiClient.defaults.baseURL}${fullRequestUrl}`);
    const response = await apiClient.get(fullRequestUrl);
    // Django 뷰가 {'results': [...], 'totalCount': N} 형태로 응답한다고 가정
    return response.data; 
  } catch (error) {
    console.error('Error fetching local patients from Django backend:', error);
    if (error.response) {
      console.error('Error response data (fetchLocalPatients):', error.response.data);
      console.error(`Error response status (fetchLocalPatients): ${error.response.status}`);
    }
    throw error;
  }
};

/**
 * OpenMRS와 동기화를 시도한 후, Django 로컬 데이터베이스에서 환자 목록을 조회합니다.
 */
export const fetchAndSyncPatients = async (query = '', syncQuery = "1000") => {
  // query: Django DB 내에서 최종 목록을 필터링할 때 사용
  // syncQuery: OpenMRS에서 데이터를 가져올 때 사용할 검색어
  try {
    let requestUrl = `/patients/sync-and-list/?`; // Django urls.py에 정의된 경로
    const params = new URLSearchParams();
    if (query) { 
      params.append('q', query);
    }
    if (syncQuery) { 
        params.append('sync_q', syncQuery); // Django 뷰에서 이 파라미터로 받음
    }
    // params.append('limit', '20'); // 목록 조회 시 페이징
    // params.append('startIndex', '0');
    // params.append('sync_limit', '50'); // 동기화 시 가져올 개수 등도 파라미터로 전달 가능
    // params.append('sync_max', '200');
    
    const fullRequestUrl = `${requestUrl}${params.toString()}`;
    console.log(`Requesting Django API (fetchAndSyncPatients): ${apiClient.defaults.baseURL}${fullRequestUrl}`);
    const response = await apiClient.get(fullRequestUrl);
    return response.data; 
  } catch (error) {
    console.error('Error fetching and syncing patients from Django backend:', error);
    if (error.response) {
      console.error('Error response data (fetchAndSyncPatients):', error.response.data);
      console.error(`Error response status (fetchAndSyncPatients): ${error.response.status}`);
    }
    throw error;
  }
};

/**
 * Django API를 통해 특정 환자의 상세 정보를 조회합니다.
 * (Django는 필요시 OpenMRS에서 데이터를 가져와 DB에 저장/업데이트합니다)
 */
export const fetchPatientDetails = async (patientUuid) => {
  if (!patientUuid) {
    const errorMessage = 'Patient UUID is required for fetchPatientDetails.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  try {
    // Django urls.py: path('patients/<str:patient_uuid>/', ...)
    const requestUrl = `/patients/${patientUuid}/`; 
    console.log(`Requesting Django API (fetchPatientDetails for ${patientUuid}): ${apiClient.defaults.baseURL}${requestUrl}`);
    const response = await apiClient.get(requestUrl);
    return response.data; 
  } catch (error) {
    console.error(`Error fetching patient ${patientUuid} details from Django backend:`, error);
    if (error.response) {
      console.error(`Error response data from Django (for ${patientUuid}):`, error.response.data);
      console.error(`Error response status from Django (for ${patientUuid}): ${error.response.status}`);
    }
    throw error;
  }
};

/**
 * Django API를 통해 새 환자를 등록합니다.
 * (Django는 OpenMRS에 환자를 생성하고, 성공 시 Django DB에도 저장합니다)
 */
export const registerPatient = async (patientData) => {
  // patientData 예시: { givenName, familyName, gender, birthdate, identifier, address1, cityVillage, phoneNumber }
  try {
    const requestUrl = `/patients/create/`; // Django urls.py에 정의된 경로
    console.log(`Requesting Django API (registerPatient): ${apiClient.defaults.baseURL}${requestUrl} with data:`, patientData);
    const response = await apiClient.post(requestUrl, patientData); // POST 요청
    return response.data; // Django가 반환하는 생성된 환자 정보 (OpenMRS 응답)
  } catch (error) {
    console.error('Error registering patient via Django backend:', error);
    if (error.response) {
      console.error('Error response data from Django (registerPatient):', error.response.data);
      console.error(`Error response status from Django (registerPatient): ${error.response.status}`);
    }
    throw error;
  }
};

// MainView.js에서 사용하는 함수들을 위한 alias (기존 코드 호환성)
export const fetchPatientsWithSync = fetchAndSyncPatients;
export const getPatientDetail = fetchPatientDetails;
export const updatePatient = async (patientUuid, patientData) => {
  // 업데이트 기능이 필요하면 Django에 PUT 엔드포인트 추가 후 구현
  console.warn('updatePatient not implemented yet');
  return null;
};

// 기본 export (원본과 동일)
export default {
  fetchLocalPatients,
  fetchAndSyncPatients,
  fetchPatientDetails,
  registerPatient,
  // alias들도 포함
  fetchPatientsWithSync,
  getPatientDetail,
  updatePatient,
};