// frontend/src/pacs/DicomViewerWrapper.js
import React, { useEffect, useRef } from 'react';

const DicomViewerWrapper = ({ studyInstanceUID }) => {
  const viewerRef = useRef(null);

  useEffect(() => {
    if (viewerRef.current) {
      // TODO: OHIF Viewer 초기화 코드 삽입
    }
  }, [studyInstanceUID]);

  return <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />;
};

export default DicomViewerWrapper;
