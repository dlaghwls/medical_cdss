// src/pages/PatientListPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLocalPatients, fetchAndSyncPatients, fetchPatientDetails, registerPatient, fetchDICOMStudies } from '../services/djangoApiService';

/**
 * PatientListPage: “환자 등록/검색 + 목록” 전용 페이지
 *  - 상단: 단일 환자 조회 테스트 컴포넌트
 *  - 중단: 새 환자 등록 폼
 *  - 하단: 환자 목록 (검색, 동기화, 클릭 시 상세로 이동)
 */

const PatientListPage = () => {
  const navigate = useNavigate();

  // ─────────────────────────────────────────
  // (1) 단일 환자 조회 테스트용 컴포넌트
  // ─────────────────────────────────────────
  const SinglePatientTester = () => {
    const [singlePatient, setSinglePatient] = useState(null);
    const [loadingSingle, setLoadingSingle] = useState(false);
    const [errorSingle, setErrorSingle] = useState(null);
    const TEST_PATIENT_UUID = '746e4d35-c73b-4e82-bb26-e348b6319252'; // 테스트용 UUID

    const loadSinglePatient = async () => {
      if (!TEST_PATIENT_UUID) {
        setErrorSingle('테스트할 환자 UUID를 입력하세요.');
        return;
      }
      setErrorSingle(null);
      setLoadingSingle(true);
      setSinglePatient(null);

      try {
        const patientData = await fetchPatientDetails(TEST_PATIENT_UUID);
        setSinglePatient(patientData);
      } catch (err) {
        console.error(err);
        let msg = `환자 상세 정보 로드 실패: ${err.message || '알 수 없는 오류'}`;
        if (err.response) {
          msg = `환자 상세 정보 로드 실패 (Django ${err.response.status}): ${err.response.statusText}`;
          if (err.response.data && err.response.data.error) {
            msg += ` 상세: ${err.response.data.detail || err.response.data.error}`;
          }
        } else if (err.request) {
          msg = '환자 상세 정보 로드 실패: Django 서버 응답이 없습니다.';
        }
        setErrorSingle(msg);
      } finally {
        setLoadingSingle(false);
      }
    };

    return (
      <div style={{ border: '1px dashed green', padding: '15px', marginBottom: '20px' }}>
        <h5>[테스트] 단일 환자 상세 (Django 경유)</h5>
        <button
          onClick={loadSinglePatient}
          disabled={loadingSingle}
          style={{
            padding: '8px 15px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loadingSingle ? 'not-allowed' : 'pointer',
            marginBottom: '10px',
          }}
        >
          {loadingSingle ? '로딩 중...' : `UUID (${TEST_PATIENT_UUID.substring(0, 8)}...) 정보 가져오기`}
        </button>
        {loadingSingle && <p>로딩 중...</p>}
        {errorSingle && <p style={{ color: 'red', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>{errorSingle}</p>}
        {singlePatient && !errorSingle && (
          <div>
            <p>
              <strong>이름 (Display):</strong>{' '}
              {singlePatient.display || (singlePatient.person && singlePatient.person.display) || '정보 없음'}
            </p>
            <p>
              <strong>UUID:</strong> {singlePatient.uuid || '정보 없음'}
            </p>
            {singlePatient.person && (
              <>
                <p>
                  <strong>성별:</strong> {singlePatient.person.gender || '정보 없음'}
                </p>
                <p>
                  <strong>생년월일:</strong>{' '}
                  {singlePatient.person.birthdate
                    ? new Date(singlePatient.person.birthdate).toLocaleDateString()
                    : '정보 없음'}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────
  // (2) 새 환자 등록 폼 컴포넌트
  // ─────────────────────────────────────────
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
      setError(null);
      setSuccessMessage('');
      setLoading(true);

      try {
        const patientDataToRegister = {
          givenName,
          familyName,
          gender,
          birthdate,
          identifier,
          address1,
          cityVillage,
          phoneNumber,
        };
        const registeredPatient = await registerPatient(patientDataToRegister);

        const displayIdentifier =
          registeredPatient.identifiers && registeredPatient.identifiers.length > 0
            ? registeredPatient.identifiers[0].identifier
            : identifier;

        setSuccessMessage(
          `환자 [${registeredPatient.display || `${givenName} ${familyName}`}] 등록 성공! UUID: ${registeredPatient.uuid}, Identifier: ${displayIdentifier}`
        );
        // 입력 폼 초기화
        setGivenName('');
        setFamilyName('');
        setGender('M');
        setBirthdate('');
        setIdentifier('');
        setAddress1('');
        setCityVillage('');
        setPhoneNumber('');

        if (onRegistrationSuccess) onRegistrationSuccess();
      } catch (err) {
        console.error(err);
        let msg = `환자 등록 실패: ${err.message || '알 수 없는 오류'}`;
        if (err.response && err.response.data && err.response.data.error) {
          msg += ` 상세: ${err.response.data.detail || err.response.data.error}`;
        } else if (err.response) {
          msg = `환자 등록 실패 (Django ${err.response.status}): ${err.response.statusText}`;
          if (typeof err.response.data === 'string' && err.response.data.toLowerCase().includes('<html')) {
            msg += ' (Django 서버에서 HTML 오류 페이지를 반환했습니다.)';
          } else if (err.response.data && typeof err.response.data === 'object') {
            msg += ` 서버 응답: ${JSON.stringify(err.response.data)}`;
          }
        } else if (err.request) {
          msg = '환자 등록 실패: Django 서버 응답이 없습니다.';
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div style={{ border: '1px solid #28a745', padding: '20px', borderRadius: '8px', marginTop: '20px', marginBottom: '20px' }}>
        <h4>새 환자 등록 (OpenMRS와 동기화)</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
            <div>
              <label>Given Name (이름):*</label>
              <input
                type="text"
                value={givenName}
                onChange={(e) => setGivenName(e.target.value)}
                required
                style={{ width: '90%', padding: '8px' }}
              />
            </div>
            <div>
              <label>Family Name (성):*</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                style={{ width: '90%', padding: '8px' }}
              />
            </div>
            <div>
              <label>Identifier (환자 ID):*</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="예: TESTID001"
                style={{ width: '90%', padding: '8px' }}
              />
            </div>
            <div>
              <label>Gender (성별):*</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{ width: '95%', padding: '8px' }}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label>Birthdate (생년월일):*</label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
                style={{ width: 'calc(47.5% - 5px)', padding: '8px' }}
              />
            </div>
            <div>
              <label>Address 1 (주소 1):</label>
              <input
                type="text"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                style={{ width: '90%', padding: '8px' }}
              />
            </div>
            <div>
              <label>City/Village (도시):</label>
              <input
                type="text"
                value={cityVillage}
                onChange={(e) => setCityVillage(e.target.value)}
                style={{ width: '90%', padding: '8px' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label>Phone Number (전화번호):</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="예: 010-1234-5678"
                style={{ width: 'calc(47.5% - 5px)', padding: '8px' }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '15px',
              padding: '10px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '등록 중...' : '환자 등록'}
          </button>
          {error && (
            <p style={{ color: 'red', marginTop: '10px', whiteSpace: 'pre-wrap' }}>{error}</p>
          )}
          {successMessage && <p style={{ color: 'green', marginTop: '10px' }}>{successMessage}</p>}
        </form>
      </div>
    );
  };

  // ─────────────────────────────────────────
  // (3) 환자 목록 (검색, 동기화, 클릭 시 상세 이동)
  // ─────────────────────────────────────────
  const [patients, setPatients] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalPatients, setTotalPatients] = useState(0);

  // 새 환자가 등록될 때마다 토글 값이 바뀌면 useEffect가 목록을 다시 불러옵니다.
  const [refreshToggle, setRefreshToggle] = useState(false);

  const loadLocalPatientList = async (currentSearchTerm = '') => {
    setErrorList(null);
    setLoadingList(true);
    try {
      const responseData = await fetchLocalPatients(currentSearchTerm);
      if (responseData && Array.isArray(responseData.results)) {
        setPatients(responseData.results);
        setTotalPatients(responseData.totalCount || responseData.results.length);
      } else {
        setPatients([]);
        setTotalPatients(0);
      }
    } catch (err) {
      let msg = `환자 목록 로드 실패: ${err.message || '알 수 없는 오류'}`;
      if (err.response) {
        msg = `환자 목록 로드 실패 (Django ${err.response.status}): ${err.response.statusText}`;
        if (err.response.data && err.response.data.error) {
          msg += ` 상세: ${err.response.data.detail || err.response.data.error}`;
        }
      } else if (err.request) {
        msg = '환자 목록 로드 실패: Django 서버에서 응답이 없습니다.';
      }
      setErrorList(msg);
      setPatients([]);
      setTotalPatients(0);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSyncAndRefreshList = async () => {
    setErrorList(null);
    setLoadingList(true);
    try {
      const responseData = await fetchAndSyncPatients(searchTerm);
      if (responseData && Array.isArray(responseData.results)) {
        setPatients(responseData.results);
        setTotalPatients(responseData.totalCount || responseData.results.length);
      } else {
        setPatients([]);
        setTotalPatients(0);
      }
    } catch (err) {
      let msg = `환자 목록 로드/동기화 실패: ${err.message || '알 수 없는 오류'}`;
      if (err.response) {
        msg = `환자 목록 로드/동기화 실패 (Django ${err.response.status}): ${err.response.statusText}`;
        if (err.response.data && err.response.data.error) {
          msg += ` 상세: ${err.response.data.detail || err.response.data.error}`;
        }
      } else if (err.request) {
        msg = '환자 목록 로드/동기화 실패: Django 서버에서 응답이 없습니다.';
      }
      setErrorList(msg);
      setPatients([]);
      setTotalPatients(0);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    // 페이지 로드 시와, 검색어 변경 또는 refreshToggle 변경 시 목록을 로드
    loadLocalPatientList();
  }, [refreshToggle]);

  const handleSearchList = (e) => {
    e?.preventDefault();
    loadLocalPatientList(searchTerm);
  };

  // ─────────────────────────────────────────
  // (4) 환자 등록 성공 시 호출: 목록을 다시 불러오기 위해 토글
  // ─────────────────────────────────────────
  const onPatientRegistered = () => {
    setRefreshToggle((prev) => !prev);
  };

  // ─────────────────────────────────────────
  // (5) 렌더링
  // ─────────────────────────────────────────
  return (
    <div style={{ padding: '20px' }}>
      {/* (1) 단일 환자 테스트 */}
      <SinglePatientTester />
      <hr style={{ margin: '20px 0' }} />

      {/* (2) 새 환자 등록 폼 */}
      <PatientRegistrationForm onRegistrationSuccess={onPatientRegistered} />
      <hr style={{ margin: '20px 0' }} />

      {/* (3) 환자 목록 섹션 */}
      <div>
        <h4>환자 목록 (Django DB 조회)</h4>

        {/* 검색 + 동기화 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <form onSubmit={handleSearchList} style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="환자 이름, ID, UUID 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px',
                width: '300px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginRight: '10px',
                fontSize: '1rem',
              }}
            />
            <button
              type="submit"
              disabled={loadingList}
              style={{
                padding: '10px 20px',
                cursor: loadingList ? 'not-allowed' : 'pointer',
                backgroundColor: loadingList ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            >
              {loadingList && searchTerm ? '검색 중...' : '검색 (로컬 DB)'}
            </button>
          </form>
          <button
            onClick={handleSyncAndRefreshList}
            disabled={loadingList}
            style={{
              padding: '10px 20px',
              cursor: loadingList ? 'not-allowed' : 'pointer',
              backgroundColor: loadingList ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              marginLeft: '10px',
            }}
          >
            {loadingList ? '동기화 중...' : 'OpenMRS와 동기화 후 새로고침'}
          </button>
        </div>

        {loadingList && <p style={{ fontStyle: 'italic' }}>환자 목록을 불러오는 중...</p>}
        {errorList && (
          <p
            style={{
              color: 'red',
              fontWeight: 'bold',
              marginTop: '15px',
              whiteSpace: 'pre-wrap',
              border: '1px solid red',
              padding: '10px',
              borderRadius: '4px',
              backgroundColor: '#ffebee',
            }}
          >
            {errorList}
          </p>
        )}

        {!loadingList && patients.length === 0 && !errorList && (
          <p style={{ marginTop: '15px' }}>
            표시할 환자가 없거나, 검색 결과가 없습니다. (먼저 "OpenMRS와 동기화 후 새로고침"을 시도하거나
            환자를 등록해보세요)
          </p>
        )}

        {!loadingList && !errorList && patients.length > 0 && (
          <>
            <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>
              총 {totalPatients}명의 환자 중 {patients.length}명 표시 (Django DB 기준)
            </p>
            <ul style={{ listStyleType: 'none', padding: 0, marginTop: '5px' }}>
              {patients.map((patient) => (
                <li
                  key={patient.uuid}
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '12px 5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background-color 0.2s ease-in-out',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    navigate(`/patients/${patient.uuid}/dicom`);
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9f9f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>
                      {patient.display ||
                        (patient.person && patient.person.display) ||
                        `환자 (UUID: ${patient.uuid.substring(0, 8)})`}
                    </strong>
                    <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '15px' }}>
                      (UUID: {patient.uuid})
                    </span>
                  </div>
                  <div style={{ color: '#007bff', fontSize: '0.9rem' }}>▶ 상세 보기</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default PatientListPage;
