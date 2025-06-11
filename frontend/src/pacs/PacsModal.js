import React, { useState, useEffect } from 'react';
import { getStudiesForPatient } from './pacsService';
import DicomViewerWrapper from './DicomViewerWrapper';
import UploadDicom from './UploadDicom';
import { Modal, Button } from 'react-bootstrap';

const PacsModal = ({ show, onClose, patientUuid }) => {
  // 초기 상태는 빈 배열로 유지하는 것이 좋습니다.
  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가

  const fetchStudies = () => {
    setIsLoading(true);
    getStudiesForPatient(patientUuid)
      .then(response => {
        // ★★★★★ 수정된 부분 1: response에서 .data를 추출해서 저장합니다.
        setStudies(response.data || []); // 데이터가 null일 경우를 대비해 빈 배열로 설정
      })
      .catch(error => {
        console.error("스터디 목록을 불러오는 데 실패했습니다:", error);
        setStudies([]); // 에러 발생 시에도 빈 배열로 초기화
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (show && patientUuid) {
      fetchStudies();
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
          // ★★★★★ 수정된 부분 2: 업로드 후에도 새로운 목록을 다시 불러옵니다.
          onUploaded={fetchStudies}
        />
        <hr />
        <div className="row">
          <div className="col-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <ul className="list-group">
              {/* ★★★★★ 수정된 부분 3: 로딩 및 데이터 유무에 따른 조건부 렌더링 */}
              {isLoading ? (
                <li className="list-group-item">로딩 중...</li>
              ) : studies && studies.length > 0 ? (
                studies.map((s) => (
                  <li
                    // DICOM 표준에 따라 StudyInstanceUID가 더 고유한 키입니다.
                    key={s.StudyInstanceUID || s.ID}
                    className={`list-group-item ${s.StudyInstanceUID === selectedStudy ? 'active' : ''}`}
                    onClick={() => setSelectedStudy(s.StudyInstanceUID)}
                    style={{ cursor: 'pointer' }}
                  >
                    {s.StudyDescription || '설명 없음'}
                    <br />
                    <small>{s.StudyDate}</small>
                  </li>
                ))
              ) : (
                <li className="list-group-item">표시할 스터디가 없습니다.</li>
              )}
            </ul>
          </div>
          <div className="col-8" style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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