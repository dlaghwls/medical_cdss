// src/contexts/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
// ▼▼▼ 1. API 서비스 import 경로를 authService로 변경합니다. ▼▼▼
import { loginApi } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 앱이 처음 시작될 때 로딩 상태만 관리합니다.
  useEffect(() => {
    setLoading(false);
  }, []);

  // ▼▼▼ 2. login 함수를 authService.js 방식에 맞게 수정합니다. ▼▼▼
  const login = async (employeeId, password) => {
    setLoading(true);
    setError('');
    try {
      // authService.js의 loginApi는 user 객체만 반환합니다.
      const userData = await loginApi(employeeId, password);
      
      setUser(userData);

      // 가짜 로그인 방식이므로, 실제 서버 토큰이 남아있지 않도록 삭제합니다.
      localStorage.removeItem('authToken');

      return userData;
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    // 로그아웃 시 localStorage에 저장된 토큰도 반드시 제거해야 합니다.
    localStorage.removeItem('authToken');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading: loading,
    authError: error,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* 초기 로딩 중이 아닐 때만 자식 컴포넌트들을 렌더링합니다. */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};