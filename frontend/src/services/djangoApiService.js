import axios from 'axios';

// 모든 API 호출의 베이스 URL을 여기서 정의합니다.
const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// ★★★★★ 1. 요청 인터셉터 추가 ★★★★★
// 모든 요청이 보내지기 전에 실행되어, 로컬 스토리지의 토큰을 헤더에 자동으로 추가합니다.
apiClient.interceptors.request.use(
    config => {
        const authToken = localStorage.getItem('authToken'); // 로컬 스토리지에서 토큰 가져오기
        if (authToken) {
            // 'Token ' 접두사를 붙여 Authorization 헤더를 설정합니다.
            // (Django REST Framework의 TokenAuthentication 기본 방식)
            config.headers.Authorization = `Token ${authToken}`;
        }
        return config;
    },
    error => {
        // 요청 에러 발생 시 처리
        return Promise.reject(error);
    }
);

// ★★★★★ 2. 실제 로그인 API 함수 추가 ★★★★★
/**
 * Django 백엔드에 로그인을 요청하고, 성공 시 { token, user } 객체를 반환합니다.
 */
export const loginApi = async (employeeId, password) => {
    try {
        // Django의 로그인 API 엔드포인트로 POST 요청
        // 중요: 'auth/login/' 부분은 실제 백엔드 URL에 맞게 수정해야 할 수 있습니다.
        const response = await apiClient.post('auth/login/', {
            username: employeeId, // 백엔드가 받는 필드명에 맞게 수정 (ex: username, email 등)
            password: password,
        });
        // 성공 시 응답 데이터 { token, user } 를 반환
        return response.data;
    } catch (error) {
        console.error("Login API error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || '로그인에 실패했습니다.');
    }
};


/**
 * Django 로컬 데이터베이스에서만 환자 목록을 조회합니다.
 */
export const fetchLocalPatients = async (query = '') => {
    try {
        let requestUrl = `omrs/patients/local-list/?`;
        const params = new URLSearchParams();
        if (query) {
            params.append('q', query);
        }

        const fullRequestUrl = `${requestUrl}${params.toString()}`;
        console.log(`Requesting Django API (fetchLocalPatients): ${apiClient.defaults.baseURL}${fullRequestUrl}`);
        const response = await apiClient.get(fullRequestUrl);
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
    try {
        let requestUrl = `omrs/patients/sync-and-list/?`;
        const params = new URLSearchParams();
        if (query) {
            params.append('q', query);
        }
        if (syncQuery) {
            params.append('sync_q', syncQuery);
        }

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
 */
export const fetchPatientDetails = async (patientUuid) => {
    if (!patientUuid) {
        const errorMessage = 'Patient UUID is required for fetchPatientDetails.';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
    try {
        const requestUrl = `omrs/patients/${patientUuid}/`;
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
 */
export const registerPatient = async (patientData) => {
    try {
        const requestUrl = `omrs/patients/create/`;
        console.log(`Requesting Django API (registerPatient): ${apiClient.defaults.baseURL}${requestUrl} with data:`, patientData);
        const response = await apiClient.post(requestUrl, patientData);
        return response.data;
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
    console.warn('updatePatient not implemented yet');
    return null;
};

// --- LIS 관련 함수 ---
export const registerLabResult = async (labResultData) => {
    try {
        const response = await apiClient.post(`lab-results/`, labResultData);
        return response.data;
    } catch (error) {
        console.error("Error registering lab result:", error.response || error);
        throw error;
    }
};

// 특정 환자의 모든 LIS 검사 결과 조회
export const fetchLabResultsForPatient = async (patientUuid) => {
    try {
        const response = await apiClient.get(`lab-results/by-patient/?patient_uuid=${patientUuid}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching lab results for patient ${patientUuid}:`, error.response || error);
        throw error;
    }
};

// --- 새로 추가된 메시징 관련 함수들 ---

/**
 * 등록된 의료진 목록을 가져오는 함수 (GET /api/chat/staff/)
 */
export const fetchMedicalStaff = async () => {
    try {
        const response = await apiClient.get('chat/staff/');
        return response.data;
    } catch (error) {
        console.error("Error fetching medical staff:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * 특정 상대방과의 채팅 메시지 목록을 가져오는 함수 (GET /api/chat/messages/<other_user_uuid>/)
 */
export const fetchChatMessages = async (otherUserUuid) => {
    try {
        const response = await apiClient.get(`chat/messages/${otherUserUuid}/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching chat messages:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * 메시지를 전송하는 함수 (POST /api/chat/messages/new/)
 * @param {object} messageData - { sender_uuid, receiver_uuid, content }
 */
export const sendMessage = async (messageData) => {
    try {
        const response = await apiClient.post('chat/messages/new/', messageData);
        return response.data;
    } catch (error) {
        console.error("Error sending message:", error.response?.data || error.message);
        throw error;
    }
};


// 기본 export
const djangoApiService = {
    loginApi, // ★★★★★ loginApi 추가 ★★★★★
    fetchLocalPatients,
    fetchAndSyncPatients,
    fetchPatientDetails,
    registerPatient,
    // alias들도 포함
    fetchPatientsWithSync,
    getPatientDetail,
    updatePatient,
    // LIS 함수들 추가
    registerLabResult,
    fetchLabResultsForPatient,
    // 메시징 함수들 추가
    fetchMedicalStaff,
    fetchChatMessages,
    sendMessage,
};
export default djangoApiService;