// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginApi } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 초기 로딩 상태 (예: 로컬 스토리지에서 사용자 정보 확인)
  const [error, setError] = useState('');

  // 앱 시작 시 로컬 스토리지 등에서 사용자 정보 로드 시도 (선택 사항)
  useEffect(() => {
    // const storedUser = localStorage.getItem('user');
    // if (storedUser) {
    //   setUser(JSON.parse(storedUser));
    // }
    setLoading(false); // 실제 로직이 있다면 로딩 완료 후 false
  }, []);

  const login = async (employeeId, password) => {
    setLoading(true);
    setError('');
    try {
      const userData = await loginApi(employeeId, password);
      setUser(userData);
      // localStorage.setItem('user', JSON.stringify(userData)); // 로컬 스토리지에 저장 (선택 사항)
      return userData; // 로그인 성공 시 사용자 데이터 반환
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
      throw err; // 에러를 다시 throw하여 컴포넌트에서 처리할 수 있게 함
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    // localStorage.removeItem('user'); // 로컬 스토리지에서 제거 (선택 사항)
    // 추가적인 로그아웃 처리 (예: API 호출)
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading: loading, // 로딩 상태 이름 변경 (loading -> isLoading)
    authError: error,   // 에러 상태 이름 변경 (error -> authError)
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* 초기 로딩 중에는 children 렌더링 안 함 (선택적) */}
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