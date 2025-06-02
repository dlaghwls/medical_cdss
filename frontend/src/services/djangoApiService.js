// // // src/services/openmrsService.js
// // import axios from 'axios';

// // // apiClient의 baseURL은 이제 Django API를 가리킵니다.
// // // package.json의 proxy가 Django 개발 서버 주소(예: http://localhost:8000)를 처리하므로,
// // // baseURL은 Django urls.py에 설정한 API 경로의 시작점 (예: '/api/omrs')이 됩니다.
// // const apiClient = axios.create({
// //   baseURL: '/api/omrs', // Django urls.py에 include한 경로 시작점
// // });

// // export const fetchPatients = async (query = '') => {
// //   try {
// //     const requestUrl = `/patients/?q=${encodeURIComponent(query)}`;
    
// //     // ESLint 경고가 발생했을 것으로 추정되는 console.log 수정:
// //     // apiClient.defaults.baseURL이 객체일 수 있으므로, 문자열로 안전하게 변환하거나
// //     // 혹은 템플릿 리터럴 내에서 직접 접근 시 불필요한 이스케이프 제거
// //     console.log(`Requesting Django API (fetchPatients): ${String(apiClient.defaults.baseURL)}${requestUrl}`); 
// //     // 또는 더 간단하게:
// //     // console.log(`Requesting Django API (fetchPatients): /api/omrs${requestUrl}`);

// //     const response = await apiClient.get(requestUrl);
// //     return response.data.patients || []; 
// //   } catch (error) {
// //     console.error('Error fetching patients from Django backend:', error);
// //     if (error.response) {
// //       // ESLint 경고가 발생했을 것으로 추정되는 console.error 수정:
// //       console.error('Error response data from Django (fetchPatients):', error.response.data);
// //       console.error(`Error response status from Django (fetchPatients): ${error.response.status}`);
// //     }
// //     throw error;
// //   }
// // };

// // export const fetchPatientDetails = async (patientUuid) => {
// //   if (!patientUuid) {
// //     const errorMessage = 'Patient UUID is required for fetchPatientDetails.';
// //     console.error(errorMessage);
// //     throw new Error(errorMessage);
// //   }
// //   try {
// //     const requestUrl = `/patient/${patientUuid}/`; 
    
// //     // ESLint 경고가 발생했을 것으로 추정되는 console.log 수정:
// //     console.log(`Requesting Django API (fetchPatientDetails): ${String(apiClient.defaults.baseURL)}${requestUrl}`);
// //     // 또는 더 간단하게:
// //     // console.log(`Requesting Django API (fetchPatientDetails): /api/omrs${requestUrl}`);

// //     const response = await apiClient.get(requestUrl);
// //     return response.data; 
// //   } catch (error) {
// //     console.error(`Error fetching patient ${patientUuid} details from Django backend:`, error);
// //     if (error.response) {
// //       // ESLint 경고가 발생했을 것으로 추정되는 console.error 수정:
// //       console.error(`Error response data from Django (fetchPatientDetails for ${patientUuid}):`, error.response.data);
// //       console.error(`Error response status from Django (fetchPatientDetails for ${patientUuid}): ${error.response.status}`);
// //     }
// //     throw error;
// //   }
// // };

// // src/services/djangoApiService.js (파일 이름을 이렇게 변경하는 것을 권장합니다)
// // src/services/djangoApiService.js
// import axios from 'axios';

// const apiClient = axios.create({
//   baseURL: '/api/omrs', // Django API의 기본 경로 (proxy 설정 http://localhost:8000 기준)
//   headers: {
//     'Content-Type': 'application/json',
//     // Django API에 맞는 인증 토큰이 필요하면 여기에 추가
//   },
// });

// /**
//  * Django 로컬 데이터베이스에서만 환자 목록을 조회합니다.
//  */
// export const fetchLocalPatients = async (query = '') => {
//   try {
//     let requestUrl = `/patients/local-list/?`; // <--- Django urls.py에 정의된 경로
//     const params = new URLSearchParams();
//     if (query) {
//       params.append('q', query);
//     }
//     // params.append('limit', '20'); // 페이징 파라미터 추가 가능
//     // params.append('startIndex', '0');
    
//     const fullRequestUrl = `${requestUrl}${params.toString()}`;
//     console.log(`Requesting Django API (fetchLocalPatients): ${apiClient.defaults.baseURL}${fullRequestUrl}`);
//     const response = await apiClient.get(fullRequestUrl);
//     // Django 뷰가 {'results': [...], 'totalCount': N} 형태로 응답한다고 가정
//     return response.data; 
//   } catch (error) {
//     console.error('Error fetching local patients from Django backend:', error);
//     if (error.response) {
//       console.error('Error response data (fetchLocalPatients):', error.response.data);
//       console.error(`Error response status (fetchLocalPatients): ${error.response.status}`);
//     }
//     throw error;
//   }
// };

// /**
//  * OpenMRS와 동기화를 시도한 후, Django 로컬 데이터베이스에서 환자 목록을 조회합니다.
//  */
// export const fetchAndSyncPatients = async (query = '', syncQuery = "1000") => {
//   try {
//     let requestUrl = `/patients/sync-and-list/?`; // <--- Django urls.py에 정의된 경로
//     const params = new URLSearchParams();
//     if (query) { // Django DB 내 검색용 q
//       params.append('q', query);
//     }
//     if (syncQuery) { // OpenMRS 동기화 시 사용할 q
//         params.append('sync_q', syncQuery); // Django 뷰에서 이 파라미터로 받음
//     }
//     // params.append('limit', '20');
//     // params.append('startIndex', '0');
    
//     const fullRequestUrl = `${requestUrl}${params.toString()}`;
//     console.log(`Requesting Django API (fetchAndSyncPatients): ${apiClient.defaults.baseURL}${fullRequestUrl}`);
//     const response = await apiClient.get(fullRequestUrl);
//     return response.data; 
//   } catch (error) {
//     console.error('Error fetching and syncing patients from Django backend:', error);
//     if (error.response) {
//       console.error('Error response data (fetchAndSyncPatients):', error.response.data);
//       console.error(`Error response status (fetchAndSyncPatients): ${error.response.status}`);
//     }
//     throw error;
//   }
// };

// // 단일 환자 상세 정보 조회 함수는 Django URL 패턴과 일치해야 합니다.
// export const fetchPatientDetails = async (patientUuid) => {
//   if (!patientUuid) {
//     const errorMessage = 'Patient UUID is required for fetchPatientDetails.';
//     console.error(errorMessage);
//     throw new Error(errorMessage);
//   }
//   try {
//     // Django urls.py: path('patients/<str:patient_uuid>/', ...)
//     const requestUrl = `/patients/${patientUuid}/`; 
//     console.log(`Requesting Django API (fetchPatientDetails for ${patientUuid}): ${apiClient.defaults.baseURL}${requestUrl}`);
//     const response = await apiClient.get(requestUrl);
//     return response.data; 
//   } catch (error) {
//     console.error(`Error fetching patient ${patientUuid} details from Django backend:`, error);
//     if (error.response) {
//       console.error(`Error response data from Django (for ${patientUuid}):`, error.response.data);
//       console.error(`Error response status from Django (for ${patientUuid}): ${error.response.status}`);
//     }
//     throw error;
//   }
// };
// 불러오기 완

// src/services/djangoApiService.js
// src/services/djangoApiService.js
import axios from 'axios';

// apiClient의 baseURL은 React 앱의 proxy 설정이 Django 개발 서버 (예: http://localhost:8000)를
// 가리키고 있을 때, Django urls.py에 설정한 API 경로의 시작점입니다.
const apiClient = axios.create({
  baseURL: '/api/omrs', // 예: Django 프로젝트 urls.py에 'api/omrs/'로 include한 경우
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