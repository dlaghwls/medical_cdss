// src/components/Common/DicomUploader.js

import React, { useState } from 'react';
import dcmjs from 'dcmjs';
import { uploadDicomToOrthanc } from '../../services/orthancService';

export default function DicomUploader({ patientUuid, onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // 파일 선택
  const handleFileChange = (e) => {
    setError(null);
    if (e.target.files?.length) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // 업로드 & PatientID 덮어쓰기
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('파일을 선택해주세요.');
      return;
    }
    setUploading(true);
    setError(null);

    try {
      // 1) ArrayBuffer 로 읽기
      const arrayBuffer = await selectedFile.arrayBuffer();

      // 2) DICOM 파싱
      const dicomData = dcmjs.data.DicomMessage.readFile(arrayBuffer);
      const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);

      // 3) PatientID 태그에 FHIR UUID 덮어쓰기
      dataset.PatientID = patientUuid;

      // 4) DICOM Part-10 바이트 다시 생성
      const denat = dcmjs.data.DicomMetaDictionary.denaturalizeDataset(dataset);
      const part10 = dcmjs.data.DicomMessage.writeFile(denat, dicomData.meta);

      // 5) Blob → File 로 만들어서 업로드
      const blob = new Blob([part10], { type: 'application/dicom' });
      const fixedFile = new File([blob], selectedFile.name, { type: 'application/dicom' });

      // 6) Orthanc 에 업로드
      const instanceID = await uploadDicomToOrthanc(fixedFile);
      alert(`DICOM 파일이 Orthanc에 업로드되었습니다.\nInstance ID: ${instanceID}`);

      // 7) 부모 컴포넌트에 업로드 완료 알림 (스터디 목록 갱신)
      onUploaded();

      // 초기화
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      setError('DICOM 파일 처리 또는 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      <h3>DICOM 파일 업로드</h3>
      <input
        type="file"
        accept=".dcm,*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button
        onClick={handleUpload}
        disabled={uploading || !selectedFile}
        style={{
          marginLeft: '10px',
          padding: '6px 12px',
          backgroundColor: uploading ? '#ccc' : '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer',
        }}
      >
        {uploading ? '업로드 중…' : '업로드'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '8px' }}>{error}</p>}
    </div>
  );
}
