// src/pages/PatientDicomPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { fetchPatientDetails } from '../services/djangoApiService';
import {
  uploadDicomToOrthanc,
  fetchStudiesByPatient,
} from '../services/orthancService';


const PatientDicomPage = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();

  // (A) 환자 기본 정보
  const [patientInfo, setPatientInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);

  useEffect(() => {
    const loadPatientInfo = async () => {
      setLoadingInfo(true);
      setErrorInfo(null);
      try {
        const data = await fetchPatientDetails(uuid);
        setPatientInfo(data);
      } catch {
        setErrorInfo('환자 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoadingInfo(false);
      }
    };
    loadPatientInfo();
  }, [uuid]);

  // (B) DICOM 업로드 상태
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // (C) Orthanc 스터디 조회 상태
  const [studies, setStudies] = useState([]);
  const [loadingStudies, setLoadingStudies] = useState(false);
  const [studiesError, setStudiesError] = useState(null);

  const loadStudies = async () => {
    setLoadingStudies(true);
    setStudiesError(null);
    try {
      const list = await fetchStudiesByPatient(uuid);
      setStudies(list);
    } catch {
      setStudiesError('스터디 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingStudies(false);
    }
  };

  // 컴포넌트 마운트 시, 그리고 uuid 변경 시
  useEffect(() => {
    loadStudies();
  }, [uuid]);

  // (D) 업로드 핸들러
  const handleFileChange = e => {
    setUploadError(null);
    if (e.target.files?.length) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('업로드할 DICOM 파일을 선택해주세요.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const instanceID = await uploadDicomToOrthanc(selectedFile);
      // 성공 메시지
      alert(`DICOM 파일이 Orthanc에 업로드되었습니다.\nInstance ID: ${instanceID}`);
      // 업로드 직후 리스트 갱신
      await loadStudies();
      setSelectedFile(null);
    } catch {
      setUploadError('DICOM 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // (E) 날짜 기준 내림차순 정렬
  const sortedStudies = [...studies].sort((a, b) => {
    const dateA = a['00080020']?.Value?.[0];
    const dateB = b['00080020']?.Value?.[0];
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        ← 뒤로
      </button>
      <h2>환자 상세 페이지 (ID: {uuid})</h2>

      {/* 환자 정보 */}
      {loadingInfo && <p>환자 정보를 불러오는 중...</p>}
      {errorInfo && <p style={{ color: 'red' }}>{errorInfo}</p>}
      {!loadingInfo && !errorInfo && patientInfo && (
        <div style={{ marginBottom: '30px' }}>
          <p><strong>이름:</strong> {patientInfo.display || '정보 없음'}</p>
          <p><strong>UUID:</strong> {patientInfo.uuid || '정보 없음'}</p>
        </div>
        
      )}

      {/* DICOM 업로드 */}
      <div
        style={{
          marginBottom: '40px',
          padding: '20px',
          border: '1px dashed #007bff',
          borderRadius: '8px',
          backgroundColor: '#f8f9fa',
        }}
      >
        <h3>DICOM 파일 업로드</h3>
        <input
          type="file"
          accept=".dcm,*"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ marginTop: '10px' }}
        />
        <br />
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            marginTop: '10px',
            backgroundColor: uploading ? '#ccc' : '#17a2b8',
            color: 'white',
            padding: '8px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? '업로드 중...' : '업로드'}
        </button>
        {uploadError && <p style={{ color: 'red' }}>{uploadError}</p>}
      </div>

      {/* 저장된 스터디 목록 */}
      <div style={{ marginBottom: '40px' }}>
        <h3>저장된 스터디 목록</h3>
        {loadingStudies && <p>스터디 목록 불러오는 중...</p>}
        {studiesError && <p style={{ color: 'red' }}>{studiesError}</p>}
        {!loadingStudies && sortedStudies.length === 0 && (
          <p>저장된 스터디가 없습니다.</p>
        )}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {sortedStudies.map((study, idx) => {
            const uid = study['0020000D']?.Value?.[0] || idx;
            const date = study['00080020']?.Value?.[0];
            return (
              <li key={uid} style={{ margin: '8px 0' }}>
                <span style={{ marginRight: '10px' }}>
                  {date
                    ? new Date(date).toLocaleString()
                    : 'Unknown Date'}
                </span>
                <button
                  onClick={() => navigate(`/viewer/${uid}`)}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    padding: '4px 8px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  뷰어 열기
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default PatientDicomPage;
