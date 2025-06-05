// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom'; // Link 추가

const LoginPage = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(employeeId, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login failed from LoginPage:", err);
    }
  };

  return (
    <div className="login-page-container" style={{maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)'}}>
      <h2 style={{textAlign: 'center', marginBottom: '20px'}}>병원 시스템 로그인</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="employeeId" style={{ display: 'block', marginBottom: '5px' }}>사원번호:</label>
          <input
            type="text"
            id="employeeId"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="예: DOC-0001, NUR-0001, TEC-0001"
            required
            style={{ width: 'calc(100% - 22px)', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}> {/* 비밀번호 필드 아래 마진 증가 */}
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>비밀번호:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: 'calc(100% - 22px)', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', marginBottom: '10px' }}>
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
        {authError && <p style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{authError}</p>}
      </form>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p style={{marginBottom: '5px'}}>계정이 없으신가요?</p>
        <Link to="/signup" style={{ color: '#007bff', textDecoration: 'none' }}>
          회원가입
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;