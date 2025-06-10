// frontend/src/pacs/PacsButton.js
import React from 'react';

const PacsButton = ({ onOpen }) => (
  <button className="btn btn-info ml-2" onClick={onOpen}>
    CT/MRI 이미지 등록
  </button>
);

export default PacsButton;
