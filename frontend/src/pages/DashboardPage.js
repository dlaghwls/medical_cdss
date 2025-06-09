// src/pages/DashboardPage.js

import React from 'react';

const DashboardPage = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h3>StrokeCare+ (메인 환자 현황판)</h3>
      <p>여기에 대시보드 차트나 요약 정보를 표시하세요.</p>
      {/* 예시 대시보드 이미지 */}
      <img
        src="https://user-images.githubusercontent.com/8344230/227930965-12e8270c-2694-49a9-8862-78f805952f03.png"
        alt="Main Dashboard Example"
        style={{
          maxWidth: '100%',
          height: 'auto',
          marginTop: '20px',
          border: '1px solid #ddd',
        }}
      />
    </div>
  );
};

export default DashboardPage;
