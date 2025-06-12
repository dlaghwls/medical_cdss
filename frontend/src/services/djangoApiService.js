import axios from 'axios';

// 모든 API 호출의 베이스 URL을 여기서 정의합니다.
const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

// 모든 요청이 보내지기 전에 실행되어, 로컬 스토리지의 토큰을 헤더에 자동으로 추가합니다.
apiClient.interceptors.request.use(
    config => {
        const authToken = localStorage.getItem('authToken'); // 로컬 스토리지에서 토큰 가져오기
        if (authToken) {
            // 'Token ' 접두사를 붙여 Authorization 헤더를 설정합니다.
            config.headers.Authorization = `Token ${authToken}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

/**
 * Django 백엔드에 로그인을 요청하고, 성공 시 { token, user } 객체를 반환합니다.
 */
export const loginApi = async (employeeId, password) => {
    try {
        const response = await apiClient.post('auth/login/', {
            username: employeeId,
            password: password,
        });
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
        const params = new URLSearchParams();
        if (query) {
            params.append('q', query);
        }
        const response = await apiClient.get(`omrs/patients/local-list/?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching local patients from Django backend:', error);
        throw error;
    }
};

/**
 * OpenMRS와 동기화를 시도한 후, Django 로컬 데이터베이스에서 환자 목록을 조회합니다.
 */
export const fetchAndSyncPatients = async (query = '', syncQuery = "1000") => {
    try {
        const params = new URLSearchParams();
        if (query) {
            params.append('q', query);
        }
        if (syncQuery) {
            params.append('sync_q', syncQuery);
        }
        const response = await apiClient.get(`omrs/patients/sync-and-list/?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching and syncing patients from Django backend:', error);
        throw error;
    }
};

/**
 * Django API를 통해 특정 환자의 상세 정보를 조회합니다.
 */
export const fetchPatientDetails = async (patientUuid) => {
    if (!patientUuid) throw new Error('Patient UUID is required.');
    try {
        const response = await apiClient.get(`omrs/patients/${patientUuid}/`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching patient ${patientUuid} details from Django backend:`, error);
        throw error;
    }
};

/**
 * Django API를 통해 새 환자를 등록합니다.
 */
export const registerPatient = async (patientData) => {
    try {
        const response = await apiClient.post(`omrs/patients/create/`, patientData);
        return response.data;
    } catch (error) {
        console.error('Error registering patient via Django backend:', error);
        throw error;
    }
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

export const fetchLabResultsForPatient = async (patientUuid) => {
    try {
        const response = await apiClient.get(`lab-results/by-patient/?patient_uuid=${patientUuid}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching lab results for patient ${patientUuid}:`, error.response || error);
        throw error;
    }
};

// --- 메시징 관련 함수 ---
export const fetchMedicalStaff = async () => {
    try {
        const response = await apiClient.get('chat/staff/');
        return response.data;
    } catch (error) {
        console.error("Error fetching medical staff:", error.response?.data || error.message);
        throw error;
    }
};

export const fetchChatMessages = async (otherUserUuid) => {
    try {
        const response = await apiClient.get(`chat/messages/${otherUserUuid}/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching chat messages:", error.response?.data || error.message);
        throw error;
    }
};

export const sendMessage = async (messageData) => {
    try {
        const response = await apiClient.post('chat/messages/new/', messageData);
        return response.data;
    } catch (error) {
        console.error("Error sending message:", error.response?.data || error.message);
        throw error;
    }
};


// --- SOD2, 합병증 등 데이터 등록 함수 ---
export const registerStrokeInfo = async (data) => {
    const response = await apiClient.post('lab-results/stroke-info/', data);
    return response.data;
};

export const registerComplicationsAndMedications = async (data) => {
    const response = await apiClient.post('lab-results/complications-medications/', data);
    return response.data;
};


// ★★★ 이력 조회 함수 추가 ★★★
/**
 * 특정 환자의 모든 SOD2(뇌졸중) 정보 이력을 조회합니다.
 */
export const fetchStrokeInfoHistory = async (patientUuid) => {
    try {
        // ★★★ 경로에 'lab-results/'를 추가합니다. ★★★
        const response = await apiClient.get(`lab-results/stroke-info/?patient_uuid=${patientUuid}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching stroke info history for patient ${patientUuid}:`, error.response || error);
        throw error;
    }
};

/**
 * 특정 환자의 모든 합병증 및 투약 정보 이력을 조회합니다.
 */
export const fetchComplicationsHistory = async (patientUuid) => {
    try {
        // ★★★ 경로에 'lab-results/'를 추가합니다. ★★★
        const response = await apiClient.get(`lab-results/complications-medications/?patient_uuid=${patientUuid}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching complications history for patient ${patientUuid}:`, error.response || error);
        throw error;
    }
};


// 기본 export 객체
const djangoApiService = {
    loginApi,
    fetchLocalPatients,
    fetchAndSyncPatients,
    fetchPatientDetails,
    registerPatient,
    registerLabResult,
    fetchLabResultsForPatient,
    fetchMedicalStaff,
    fetchChatMessages,
    sendMessage,
    registerStrokeInfo,
    registerComplicationsAndMedications,
    // ★★★ 새로 추가된 함수들을 export에 포함 ★★★
    fetchStrokeInfoHistory,
    fetchComplicationsHistory,
};

export default djangoApiService;
