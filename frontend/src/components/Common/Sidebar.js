// src/components/Common/Sidebar.js
import React from 'react';
import { ROLES } from '../../constants/roles';
// import './Sidebar.css'; // 필요시 CSS 파일 생성

const Sidebar = ({ user, onMenuClick }) => {
  if (!user) return null;

  const commonFunctions = [
    { id: 'patient_search', name: '환자 등록/검색', icon: '👤' },
    { id: 'vital_signs', name: 'Vital', icon: '❤️' },
    { id: 'pacs_viewer', name: 'PACS', icon: '🖼️' },
    { id: 'lab_results', name: 'LAB', icon: '🔬' },
  ];

  let roleSpecificFunctions = [];
  if (user.role === ROLES.NURSE) {
    roleSpecificFunctions = [{ id: 'nurse_tasks', name: '간호사 기능 (투약, 일지)', icon: '🩺' }];
  } else if (user.role === ROLES.DOCTOR) {
    roleSpecificFunctions = [{ id: 'doctor_tasks', name: '의사 기능 (처방, 진료)', icon: '👨‍⚕️' }];
  } else if (user.role === ROLES.TECHNICIAN) {
    roleSpecificFunctions = [{ id: 'technician_tasks', name: '검사 기능 (접수, 결과)', icon: '🧪' }];
  }

  const handleMenuItemClick = (viewId) => {
    if (onMenuClick) {
      onMenuClick(viewId);
    } else {
      alert(`${viewId} 클릭 (onMenuClick 핸들러 필요)`);
    }
  };
  
  return (
    <div className="sidebar" style={{ borderRight: '1px solid #eee', padding: '20px', width: '280px', backgroundColor: '#f8f9fa', height: 'calc(100vh - 70px)' /* 예시 높이 */ }}>
      <div className="user-profile" style={{textAlign: 'center', marginBottom: '20px'}}>
        {/* <img src={user.profileImageUrl || 'https://via.placeholder.com/80'} alt="profile" style={{width: '80px', height: '80px', borderRadius: '50%', marginBottom: '10px'}} /> */}
        <h4>{user.name} 님</h4>
        <p style={{fontSize: '0.9em', color: '#666'}}>{user.department} ({user.role})</p>
        <p style={{fontSize: '0.8em', color: '#888'}}>사원번호: {user.id}</p>
      </div>
      <hr style={{margin: '20px 0'}}/>
      <h5>공통 기능</h5>
      <ul style={{listStyle: 'none', padding: 0}}>
        {commonFunctions.map(func => (
          <li key={func.id} onClick={() => handleMenuItemClick(func.id)} style={{padding: '10px', cursor: 'pointer', borderRadius: '4px', marginBottom: '5px', hover: {backgroundColor: '#e9ecef'}}}>
            <span style={{marginRight: '10px'}}>{func.icon}</span>{func.name}
          </li>
        ))}
      </ul>
      {roleSpecificFunctions.length > 0 && (
        <>
          <hr style={{margin: '20px 0'}} />
          <h5>{user.role === ROLES.NURSE ? '간호사' : user.role === ROLES.DOCTOR ? '의사' : '기타 직원'} 주요 기능</h5>
          <ul style={{listStyle: 'none', padding: 0}}>
            {roleSpecificFunctions.map(func => (
              <li key={func.id} onClick={() => handleMenuItemClick(func.id)} style={{padding: '10px', cursor: 'pointer', borderRadius: '4px', marginBottom: '5px', hover: {backgroundColor: '#e9ecef'}}}>
                 <span style={{marginRight: '10px'}}>{func.icon}</span>{func.name}
              </li>
            ))}
          </ul>
        </>
      )}
      <button onClick={() => handleMenuItemClick('main_dashboard')} style={{marginTop: '20px', width: '100%', padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px'}}>
        메인 환자 현황판
      </button>
    </div>
  );
};

export default Sidebar;