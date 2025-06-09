// frontend/src/pages/ViewerPage.js
import React from 'react';
import { useParams } from 'react-router-dom';
import OHIFViewer from '@ohif/viewer';

export default function ViewerPage() {
  const { studyUID } = useParams();

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <OHIFViewer studyInstanceUID={studyUID} />
    </div>
  );
}
