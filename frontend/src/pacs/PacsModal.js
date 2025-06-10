// frontend/src/pacs/PacsModal.js
import React, { useState, useEffect } from 'react';
import { getStudies } from './pacsService';
import DicomViewerWrapper from './DicomViewerWrapper';
import UploadDicom from './UploadDicom';
import { Modal, Button } from 'react-bootstrap';

const PacsModal = ({ show, onClose, patientUuid }) => {
  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);

  useEffect(() => {
    if (show) {
      getStudies(patientUuid).then(setStudies);
    }
  }, [show, patientUuid]);

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>CT/MRI 이미지 등록 및 뷰어</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <UploadDicom
          patientUuid={patientUuid}
          onUploaded={() => getStudies(patientUuid).then(setStudies)}
        />
        <hr />
        <div className="row">
          <div className="col-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <ul className="list-group">
              {studies.map((s) => (
                <li
                  key={s.StudyInstanceUID}
                  className={`list-group-item ${s.StudyInstanceUID === selectedStudy ? 'active' : ''}`}
                  onClick={() => setSelectedStudy(s.StudyInstanceUID)}
                  style={{ cursor: 'pointer' }}
                >
                  {s.StudyDescription || s.StudyInstanceUID}
                  <br />
                  <small>{s.StudyDate}</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-8" style={{ height: '60vh' }}>
            {selectedStudy
              ? <DicomViewerWrapper studyInstanceUID={selectedStudy} />
              : <p>왼쪽에서 스터디를 선택해주세요.</p>
            }
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>닫기</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PacsModal;
