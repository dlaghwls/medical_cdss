import React, { useState, useEffect } from 'react';
// 서비스 함수 경로 및 이름 확인!
import { fetchLocalPatients, fetchAndSyncPatients, fetchPatientDetails, registerPatient } from '../../services/djangoApiService'; 
// LabResultsView 컴포넌트 경로 확인: MainView와 같은 'Common' 폴더 안에 있으므로 './LabResultsView'가 맞습니다.
import LabResultsView from './LabResultsView';

// 단일 환자 조회 테스트용 컴포넌트 (이전과 동일)
const SinglePatientTester = () => {
    const [singlePatient, setSinglePatient] = useState(null);
    const [loadingSingle, setLoadingSingle] = useState(false);
    const [errorSingle, setErrorSingle] = useState(null);
    // ★★★ 테스트 UUID는 실제 사용 가능한 UUID로 변경해주세요 ★★★
    const TEST_PATIENT_UUID = '746e4d35-c73b-4e82-bb26-e348b6319252'; 

    const loadSinglePatient = async () => {
        if (!TEST_PATIENT_UUID || TEST_PATIENT_UUID === '여기에_실제_환자_UUID를_입력하세요') {
            setErrorSingle('테스트할 환자 UUID를 코드에 정확히 입력해주세요.'); return;
        }
        setErrorSingle(null); setLoadingSingle(true); setSinglePatient(null);
        try {
            const patientData = await fetchPatientDetails(TEST_PATIENT_UUID);
            setSinglePatient(patientData);
            console.log("[SinglePatientTester] Fetched Single Patient Details (via Django):", patientData);
        } catch (err) {
            console.error("[SinglePatientTester] Error in loadSinglePatient (via Django):", err);
            let detailedErrorMessage = `환자 상세 정보 로드 실패: ${err.message || '알 수 없는 오류'}`;
            if (err.response) {
                detailedErrorMessage = `환자 상세 정보 로드 실패 (Django 응답): ${err.response.status} - ${err.response.statusText}.`;
                if (err.response.data && err.response.data.error) {
                    detailedErrorMessage += ` 상세: ${err.response.data.detail || err.response.data.error}`;
                } else if (typeof err.response.data === 'string' && err.response.data.toLowerCase().includes('<html')) {
                    detailedErrorMessage += " (Django 서버에서 HTML 오류 페이지를 반환했습니다. Django 로그를 확인하세요.)";
                }
            } else if (err.request) { detailedErrorMessage = '환자 상세 정보 로드 실패: Django 서버에서 응답이 없습니다.'; }
            setErrorSingle(detailedErrorMessage);
        } finally { setLoadingSingle(false); }
    };

    return (
        <div style={{border: '1px dashed green', padding: '15px', marginBottom: '20px'}}>
            <h5>[테스트] 단일 환자 상세 (Django 경유)</h5>
            <button onClick={loadSinglePatient} disabled={loadingSingle} style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.9rem', marginBottom: '10px' }}>
                {loadingSingle ? '로딩 중...' : `UUID (${TEST_PATIENT_UUID ? TEST_PATIENT_UUID.substring(0,8) : '미지정'}...) 정보 가져오기`}
            </button>
            {loadingSingle && <p>로딩 중...</p>}
            {errorSingle && <p style={{ color: 'red', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>{errorSingle}</p>}
            {singlePatient && !errorSingle && (
                <div>
                    <p><strong>이름 (Display):</strong> {singlePatient.display || (singlePatient.person && singlePatient.person.display) || '정보 없음'}</p>
                    <p><strong>UUID:</strong> {singlePatient.uuid || '정보 없음'}</p>
                    {singlePatient.person && ( <> <p><strong>성별:</strong> {singlePatient.person.gender || '정보 없음'}</p> <p><strong>생년월일:</strong> {singlePatient.person.birthdate ? new Date(singlePatient.person.birthdate).toLocaleDateString() : '정보 없음'}</p> </> )}
                </div>
            )}
        </div>
    );
};

// 새 환자 등록 폼 컴포넌트
const PatientRegistrationForm = ({ onRegistrationSuccess }) => {
    const [givenName, setGivenName] = useState('');
    const [familyName, setFamilyName] = useState('');
    const [gender, setGender] = useState('M');
    const [birthdate, setBirthdate] = useState('');
    const [identifier, setIdentifier] = useState(''); 
    const [address1, setAddress1] = useState(''); 
    const [cityVillage, setCityVillage] = useState(''); 
    const [phoneNumber, setPhoneNumber] = useState(''); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); setSuccessMessage(''); setLoading(true);
        try {
            const patientDataToRegister = { 
                givenName, 
                familyName, 
                gender, 
                birthdate, 
                identifier, 
                address1, 
                cityVillage, 
                phoneNumber 
            };
            console.log("[PatientRegistrationForm] Data to send to Django:", patientDataToRegister);
            const registeredPatient = await registerPatient(patientDataToRegister);
            
            const displayIdentifier = registeredPatient.identifiers && registeredPatient.identifiers.length > 0 
                                     ? registeredPatient.identifiers[0].identifier 
                                     : identifier; 
                                     
            setSuccessMessage(`환자 [${registeredPatient.display || `${givenName} ${familyName}`}] 등록 성공! UUID: ${registeredPatient.uuid}, Identifier: ${displayIdentifier}`);
            setGivenName(''); setFamilyName(''); setGender('M'); setBirthdate(''); 
            setIdentifier(''); 
            setAddress1(''); setCityVillage(''); setPhoneNumber('');
            if (onRegistrationSuccess) {
                onRegistrationSuccess(); 
            }
        } catch (err) {
            console.error("[PatientRegistrationForm] Error:", err);
            let detailedErrorMessage = `환자 등록 실패: ${err.message || '알 수 없는 오류'}`;
            if (err.response && err.response.data && err.response.data.error) {
                detailedErrorMessage += ` 상세: ${err.response.data.detail || err.response.data.error}`;
            } else if (err.response) {
                detailedErrorMessage = `환자 등록 실패 (Django 응답): ${err.response.status} - ${err.response.statusText}.`;
                   if (typeof err.response.data === 'string' && err.response.data.toLowerCase().includes('<html')) {
                    detailedErrorMessage += " (Django 서버에서 HTML 오류 페이지를 반환했습니다. Django 로그를 확인하세요.)";
                } else if (err.response.data && typeof err.response.data === 'object') {
                    detailedErrorMessage += ` 서버 응답: ${JSON.stringify(err.response.data)}`;
                }
            } else if (err.request) {
                detailedErrorMessage = '환자 등록 실패: Django 서버에서 응답이 없습니다.';
            }
            setError(detailedErrorMessage);
        } finally { setLoading(false); }
    };

    return (
        <div style={{border: '1px solid #28a745', padding: '20px', borderRadius: '8px', marginTop: '20px', marginBottom: '20px'}}>
            <h4>새 환자 등록 (OpenMRS와 동기화)</h4>
            <form onSubmit={handleSubmit}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px'}}>
                    <div><label>Given Name (이름):*</label><input type="text" value={givenName} onChange={(e) => setGivenName(e.target.value)} required style={{width: '90%', padding: '8px'}}/></div>
                    <div><label>Family Name (성):*</label><input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} required style={{width: '90%', padding: '8px'}}/></div>
                    {/* Identifier 입력 필드 */}
                    <div><label>Identifier (환자 ID):*</label><input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="예: TESTID001 (새롭고 고유한 ID)" style={{width: '90%', padding: '8px'}}/></div>
                    <div><label>Gender (성별):*</label><select value={gender} onChange={(e) => setGender(e.target.value)} style={{width: '95%', padding: '8px'}}><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></div>
                    <div style={{gridColumn: 'span 2'}}><label>Birthdate (생년월일):*</label><input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required style={{width: 'calc(47.5% - 5px)', padding: '8px'}} /></div>
                    <div><label>Address 1 (주소 1):</label><input type="text" value={address1} onChange={(e) => setAddress1(e.target.value)} style={{width: '90%', padding: '8px'}}/></div>
                    <div><label>City/Village (도시):</label><input type="text" value={cityVillage} onChange={(e) => setCityVillage(e.target.value)} style={{width: '90%', padding: '8px'}}/></div>
                    <div style={{gridColumn: 'span 2'}}><label>Phone Number (전화번호):</label><input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="예: 010-1234-5678" style={{width: 'calc(47.5% - 5px)', padding: '8px'}}/></div>
                </div>
                <button type="submit" disabled={loading} style={{marginTop: '15px', padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px'}}>
                    {loading ? '등록 중...' : '환자 등록'}
                </button>
                {error && <p style={{color: 'red', marginTop: '10px', whiteSpace: 'pre-wrap'}}>{error}</p>}
                {successMessage && <p style={{color: 'green', marginTop: '10px'}}>{successMessage}</p>}
            </form>
        </div>
    );
};

// 환자 목록 및 검색 컴포넌트 (MainView.js 파일 안에 함께 정의)
// ★★★ onPatientSelect 프롭을 받도록 수정 ★★★
const OpenMRSPatientList = ({ refreshTrigger, onPatientSelect }) => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalPatients, setTotalPatients] = useState(0);

    const loadLocalPatientList = async (currentSearchTerm = '') => {
        setError(null); setLoading(true);
        console.log(`[OpenMRSPatientList] loadLocalPatientList called with searchTerm: "${currentSearchTerm}"`);
        try {
            const responseData = await fetchLocalPatients(currentSearchTerm);
            console.log("[OpenMRSPatientList] Data from Django (fetchLocalPatients):", responseData);
            if (responseData && Array.isArray(responseData.results)) {
                setPatients(responseData.results);
                setTotalPatients(responseData.totalCount || responseData.results.length);
            } else {
                console.warn("[OpenMRSPatientList] fetchLocalPatients returned unexpected data or no results:", responseData);
                setPatients([]); setTotalPatients(0);
            }
        } catch (err) { 
            console.error("[OpenMRSPatientList] Error caught in loadLocalPatientList (via Django):", err);
            let detailedErrorMessage = `환자 목록 로드 실패: ${err.message || '알 수 없는 오류'}`;
            if (err.response) { 
                detailedErrorMessage = `환자 목록 로드 실패 (Django 응답): ${err.response.status} - ${err.response.statusText}.`;
                if (err.response.data && err.response.data.error) {
                    detailedErrorMessage += ` 상세: ${err.response.data.detail || err.response.data.error}`;
                } else if (typeof err.response.data === 'string' && err.response.data.toLowerCase().includes('<html')) {
                    detailedErrorMessage += " (Django 서버에서 HTML 오류 페이지를 반환했습니다. Django 로그를 확인하세요.)";
                } else if (err.response.data) {
                    detailedErrorMessage += ` 서버 응답: ${JSON.stringify(err.response.data)}`;
                }
            } else if (err.request) { detailedErrorMessage = '환자 목록 로드 실패: Django 서버에서 응답이 없습니다.';}
            setError(detailedErrorMessage); setPatients([]); setTotalPatients(0);
        } finally { setLoading(false); }
    };

    const handleSyncAndRefreshList = async () => {
        setError(null); setLoading(true);
        console.log("[OpenMRSPatientList] handleSyncAndRefreshList called. SearchTerm for Django DB filter:", searchTerm);
        try {
            const responseData = await fetchAndSyncPatients(searchTerm); 
            console.log("[OpenMRSPatientList] Data from Django (fetchAndSyncPatients):", responseData);
            if (responseData && Array.isArray(responseData.results)) {
                setPatients(responseData.results);
                setTotalPatients(responseData.totalCount || responseData.results.length);
            } else {
                console.warn("[OpenMRSPatientList] fetchAndSyncPatients returned unexpected data or no results:", responseData);
                setPatients([]); setTotalPatients(0);
            }
        } catch (err) { 
            console.error("[OpenMRSPatientList] Error caught in handleSyncAndRefreshList (via Django):", err);
            let detailedErrorMessage = `환자 목록 로드/동기화 실패: ${err.message || '알 수 없는 오류'}`;
            if (err.response) { 
                detailedErrorMessage = `환자 목록 로드/동기화 실패 (Django 응답): ${err.response.status} - ${err.response.statusText}.`;
                if (err.response.data && err.response.data.error) {
                    detailedErrorMessage += ` 상세: ${err.response.data.detail || err.response.data.error}`;
                } else if (typeof err.response.data === 'string' && err.response.data.toLowerCase().includes('<html')) {
                    detailedErrorMessage += " (Django 서버에서 HTML 오류 페이지를 반환했습니다. Django 로그를 확인하세요.)";
                } else if (err.response.data) {
                    detailedErrorMessage += ` 서버 응답: ${JSON.stringify(err.response.data)}`;
                }
            } else if (err.request) { detailedErrorMessage = '환자 목록 로드/동기화 실패: Django 서버에서 응답이 없습니다.';}
            setError(detailedErrorMessage); setPatients([]); setTotalPatients(0);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        console.log("[OpenMRSPatientList] Component did mount or refreshTrigger changed. Calling loadLocalPatientList(). Trigger value:", refreshTrigger);
        loadLocalPatientList(); 
    }, [refreshTrigger]);

    const handleSearch = (e) => { if (e) e.preventDefault(); console.log("[OpenMRSPatientList] handleSearch called with searchTerm:", searchTerm); loadLocalPatientList(searchTerm); };
    console.log("[OpenMRSPatientList] Rendering component. Patients state:", patients);

    return (
        <div>
            <h4>환자 목록 (Django DB 조회)</h4>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center' }}>
                    <input type="text" placeholder="환자 이름, ID, UUID 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '10px', width: '300px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px', fontSize: '1rem' }}/>
                    <button type="submit" disabled={loading} style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: loading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem' }}>
                        {loading && searchTerm ? '검색 중...' : '검색 (로컬 DB)'}
                    </button>
                </form>
                <button onClick={handleSyncAndRefreshList} disabled={loading} style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: loading ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', marginLeft: '10px'}}>
                    {loading ? '동기화 중...' : 'OpenMRS와 동기화 후 새로고침'}
                </button>
            </div>
            {loading && <p style={{fontStyle: 'italic'}}>환자 목록을 불러오는 중...</p>}
            {error && <p style={{ color: 'red', fontWeight: 'bold', marginTop: '15px', whiteSpace: 'pre-wrap', border: '1px solid red', padding: '10px', borderRadius: '4px', backgroundColor: '#ffebee' }}>{error}</p>}
            {!loading && patients.length === 0 && !error && (
                <p style={{marginTop: '15px'}}>표시할 환자가 없거나, 검색 결과가 없습니다. (먼저 "OpenMRS와 동기화 후 새로고침"을 시도하거나 환자를 등록해보세요)</p>
            )}
            {!loading && !error && patients.length > 0 && (
                <>
                    <p style={{marginTop: '10px', fontSize: '0.9em', color: '#555'}}>총 {totalPatients}명의 환자 중 {patients.length}명 표시 (Django DB 기준)</p>
                    <ul style={{ listStyleType: 'none', padding: 0, marginTop: '5px' }}>
                        {patients.map(patient => (
                            <li 
                                key={patient.uuid} 
                                // ★★★ onPatientSelect prop이 있을 경우에만 호출하도록 추가 ★★★
                                onClick={() => onPatientSelect && onPatientSelect(patient)} // <--- 이 부분 추가
                                style={{ 
                                    borderBottom: '1px solid #eee', padding: '12px 5px', 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    transition: 'background-color 0.2s ease-in-out',
                                    cursor: 'pointer' // 클릭 가능함을 시각적으로 보여주기 위해
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div>
                                    <strong style={{fontSize: '1.1rem'}}>{patient.display || (patient.person && patient.person.display) || `환자 (UUID: ${patient.uuid ? patient.uuid.substring(0,8) : 'N/A'})`}</strong>
                                    <span style={{fontSize: '0.85em', color: '#666', marginLeft: '15px'}}>(UUID: {patient.uuid || 'N/A'})</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

// MainView 컴포넌트
// ★★★ onViewChange prop을 받도록 수정 ★★★
const MainView = ({ currentViewId, user, onViewChange }) => { 
    const [refreshListToggle, setRefreshListToggle] = useState(false);
    const [selectedPatientForLab, setSelectedPatientForLab] = useState(null); 

    const handlePatientRegistered = () => {
        console.log("[MainView] Patient registered, toggling refresh trigger for list.");
        setRefreshListToggle(prev => !prev);
    };

    // OpenMRSPatientList에서 환자 선택 시 호출될 함수
    const handlePatientSelectionForLab = (patient) => {
        console.log("[MainView] Patient selected for LAB:", patient);
        setSelectedPatientForLab(patient);
        // 환자 선택 후 바로 'lab_results' 뷰로 전환
        if (onViewChange) { 
            onViewChange('lab_results'); // <--- 뷰를 'lab_results'로 변경하도록 상위 컴포넌트에 알림
        }
    };

    // LAB 화면에서 '환자 목록으로 돌아가기' 버튼 클릭 시 호출될 함수
    const handleBackToPatientList = () => {
        setSelectedPatientForLab(null); // 선택된 환자 초기화
        if (onViewChange) {
            onViewChange('patient_search'); // <--- 'patient_search' 뷰로 변경하도록 상위 컴포넌트에 알림
        }
    };

    let content = null;

    switch (currentViewId) {
        case 'patient_search':
            content = ( 
                <> 
                    <SinglePatientTester /> 
                    <hr style={{margin: '20px 0'}} /> 
                    <PatientRegistrationForm onRegistrationSuccess={handlePatientRegistered} /> 
                    <hr style={{margin: '20px 0'}} /> 
                    {/* OpenMRSPatientList에 onPatientSelect 프롭 전달 */}
                    <OpenMRSPatientList 
                        refreshTrigger={refreshListToggle} 
                        onPatientSelect={handlePatientSelectionForLab} // <--- 추가!
                    /> 
                </> 
            );
            break;
        case 'vital_signs': content = <div>Vital Signs 모니터링 화면입니다.</div>; break;
        case 'pacs_viewer': content = <div>PACS 이미지 뷰어 화면입니다.</div>; break;
        case 'lab_results':
            // LabResultsView 컴포넌트 이름이 올바르게 사용되었는지 재확인
            // LabResultsView.js 파일에서 export default LabResultsView; 이므로 여기서도 LabResultsView로 사용
            content = <LabResultsView selectedPatient={selectedPatientForLab} onBackToPatientList={handleBackToPatientList} />;
            break;
        case 'nurse_tasks': content = <div>간호사 기능 (투약, 간호 일지 등) 화면입니다.</div>; break;
        case 'doctor_tasks': content = <div>의사 기능 (처방 관리, 진료 기록 등) 화면입니다.</div>; break;
        case 'technician_tasks': content = <div>기타 직원 기능 (검사 접수/결과 입력 등) 화면입니다.</div>; break;
        case 'main_dashboard': 
        default:
            content = ( 
                <div> 
                    <h3>StrokeCare+ (메인 환자 현황판)</h3> 
                    <p>{user?.name}님, 환영합니다. 현재 메인 대시보드를 보고 계십니다.</p> 
                    <img src="https://user-images.githubusercontent.com/8344230/227930965-12e8270c-2694-49a9-8862-78f805952f03.png" alt="Main Dashboard Chart Example" style={{maxWidth: '100%', height: 'auto', marginTop: '20px', border: '1px solid #ddd'}} /> 
                </div> 
            );
            break;
    }
    return ( <div className="main-view" style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', height: 'calc(100vh - 70px)' }}> {content} </div> );
};
export default MainView;