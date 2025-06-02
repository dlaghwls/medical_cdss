// src/pages/SignupPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupApi } from '../services/authService'; // 수정된 signupApi 임포트
// import { useAuth } from '../contexts/AuthContext'; // 회원가입 후 자동 로그인 시 필요

const SignupPage = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // const { login } = useAuth(); // 회원가입 후 자동 로그인 시 사용

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId.match(/^(DOC-|NUR-|TEC-)\d{4}$/)) {
      setError('사원번호 형식이 올바르지 않습니다. (예: DOC-0001, NUR-0001, TEC-0001)');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await signupApi({ employeeId, password, name, department });
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
      // 만약 회원가입 후 자동 로그인 기능을 원한다면:
      // await login(employeeId, password); // AuthContext의 login 함수 사용
      // navigate('/dashboard');
    } catch (err) {
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth: '450px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)'}}>
      <h2 style={{textAlign: 'center', marginBottom: '20px'}}>회원가입</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>사원번호:</label>
          <input type="text" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="DOC-0001, NUR-0001, TEC-0001" required style={{width: 'calc(100% - 22px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>이름:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{width: 'calc(100% - 22px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>부서:</label>
          <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} required style={{width: 'calc(100% - 22px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>비밀번호:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{width: 'calc(100% - 22px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>비밀번호 확인:</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{width: 'calc(100% - 22px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}} />
        </div>
        <button type="submit" disabled={loading} style={{width: '100%', padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px'}}>
          {loading ? '가입 처리 중...' : '회원가입'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{error}</p>}
      </form>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
          이미 계정이 있으신가요? 로그인
        </Link>
      </div>
    </div>
  );
};

export default SignupPage;