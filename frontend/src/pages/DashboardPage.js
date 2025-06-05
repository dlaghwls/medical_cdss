// src/pages/DashboardPage.js
import React from 'react';
import MainLayout from '../layouts/MainLayout';

const DashboardPage = () => {
  // MainLayout이 대부분의 로직을 처리하므로, DashboardPage는 간단해질 수 있습니다.
  // 또는 MainLayout을 사용하지 않고 여기서 직접 Sidebar와 MainView를 조합할 수도 있습니다.
  // 아래는 MainLayout을 사용하는 예시입니다.
  return (
    <MainLayout />
  );
};

export default DashboardPage;