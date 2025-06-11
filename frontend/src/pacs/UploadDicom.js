import React, { useState } from 'react';
// 1. pacsService에서 가져온 함수 이름은 그대로 둡니다.
import { uploadDicomFile } from './pacsService';

// 2. ★★★ React 컴포넌트의 이름 변경 ★★★
// 소문자 'uploadDicomFile' -> 대문자 'UploadDicom' (React 컴포넌트 표준 규칙)
const UploadDicom = ({ patientUuid, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    // 사용자가 파일을 선택하지 않고 취소했을 경우를 대비
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("파일을 먼저 선택해주세요.");
      return;
    }
    setUploading(true);
    try {
      // 3. 이제 이름이 충돌하지 않으므로, import한 uploadDicomFile 함수를 정상적으로 호출할 수 있습니다.
      await uploadDicomFile(patientUuid, file);
      alert("파일이 성공적으로 등록되었습니다.");
      onUploaded(); // 부모 컴포넌트에 업로드 완료 알림 -> 스터디 목록 새로고침
    } catch (error) {
      // 4. (개선) 에러가 발생했을 때 사용자에게 알려주는 로직 추가
      console.error("DICOM 업로드 실패:", error);
      alert("파일 업로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(false);
      setFile(null); // 성공하든 실패하든 파일 선택 초기화
    }
  };

  return (
    <div className="d-flex align-items-center mb-2">
      <input className="form-control" type="file" accept=".dcm,.dicom,image/dicom" onChange={handleChange} />
      <button className="btn btn-success ms-2" onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? '업로드 중…' : 'DICOM 등록'}
      </button>
    </div>
  );
};

// 컴포넌트 이름과 일치시킴
export default UploadDicom;