// components/pacs/StudiesModal.js (파일 경로 예시)

import React from 'react';

// Study 하나에 포함된 Series 목록을 보여주는 간단한 컴포넌트
const SeriesList = ({ series }) => (
    <ul style={{ paddingLeft: '20px' }}>
        {series.map(s => (
            <li key={s.ID}>
                Series: {s.MainDicomTags.SeriesDescription || '설명 없음'} ({s.Instances.length}개 이미지)
                {/* 여기서 각 이미지를 보여주거나 뷰어로 연결하는 링크를 추가할 수 있습니다. */}
            </li>
        ))}
    </ul>
);

const StudiesModal = ({ studies, onClose }) => {
    if (!studies || studies.length === 0) {
        return (
            <div style={modalStyle}>
                <div style={modalContentStyle}>
                    <h3>영상 검사 목록</h3>
                    <p>조회된 영상 검사 정보가 없습니다.</p>
                    <button onClick={onClose} style={buttonStyle}>닫기</button>
                </div>
            </div>
        );
    }

    return (
        <div style={modalStyle}>
            <div style={modalContentStyle}>
                <h3>영상 검사 목록</h3>
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {studies.map(study => (
                        <div key={study.ID} style={{ borderBottom: '1px solid #eee', marginBottom: '10px', paddingBottom: '10px' }}>
                            <p><strong>검사일:</strong> {study.MainDicomTags.StudyDate || '날짜 정보 없음'}</p>
                            <p><strong>설명:</strong> {study.MainDicomTags.StudyDescription || '설명 없음'}</p>
                            <SeriesList series={study.Series} />
                        </div>
                    ))}
                </div>
                <button onClick={onClose} style={{ ...buttonStyle, marginTop: '20px' }}>닫기</button>
            </div>
        </div>
    );
};

// 간단한 스타일 정의
const modalStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const modalContentStyle = {
    backgroundColor: 'white', padding: '25px', borderRadius: '8px',
    width: '90%', maxWidth: '700px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
};

const buttonStyle = {
    padding: '10px 20px', backgroundColor: '#6c757d', color: 'white',
    border: 'none', borderRadius: '4px', cursor: 'pointer'
};


export default StudiesModal;