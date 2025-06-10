// frontend/src/pacs/UploadDicom.js
import React, { useState } from 'react';
import { uploadDicom } from './pacsService';

const UploadDicom = ({ patientUuid, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadDicom(patientUuid, file);
      onUploaded();
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="d-flex align-items-center mb-2">
      <input type="file" accept=".dcm" onChange={handleChange} />
      <button className="btn btn-success ml-2" onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? '업로드 중…' : 'DICOM 등록'}
      </button>
    </div>
  );
};

export default UploadDicom;
