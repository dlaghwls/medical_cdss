// src/components/Common/MainView.js

import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * MainView 컴포넌트
 *  - 기존의 currentViewId 기반 분기 로직을 완전히 제거하고,
 *    React Router의 <Outlet />만 남겨두었습니다.
 *  - App.js(또는 AppRoutes)에서 정의한 <Route> 하위 요소가
 *    이 <Outlet /> 위치에 렌더링됩니다.
 */
const MainView = () => {
  return (
    <div
      className="main-view"
      style={{
        flexGrow: 1,
        padding: '20px',
        overflowY: 'auto',
        height: 'calc(100vh - 70px)',
        backgroundColor: '#ffffff',
      }}
    >
      <Outlet />
    </div>
  );
};

export default MainView;
