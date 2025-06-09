// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
// import './index.css'; // 전역 스타일 또는 CSS Reset
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* BrowserRouter가 App 전체를 감싸도록 합니다 */}
      <App />
  </React.StrictMode>
);

reportWebVitals();
