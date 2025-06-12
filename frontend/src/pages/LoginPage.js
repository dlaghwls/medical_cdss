// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const LoginPage = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ▼▼▼ 이 코드를 추가해서 콘솔에 찍히는 값을 확인해주세요. ▼▼▼
    console.log('로그인 버튼 클릭! 전달되는 employeeId 값:', `'${employeeId}'`);

    // 만약 employeeId가 비어있으면 아예 요청을 보내지 않도록 막는 방어 코드 (추천)
    if (!employeeId || employeeId.trim() === '') {
        alert('사원번호를 입력해주세요.'); // 사용자에게 알림
        return; // 함수 실행 중단
    }

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