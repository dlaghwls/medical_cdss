// src/components/Common/Sidebar.js

import React from 'react';
import { Link } from 'react-router-dom';
import { ROLES } from '../../constants/roles';

const Sidebar = ({ user }) => {
  // user가 없으면 사이드바를 안 보여줌
  if (!user) return null;

  const commonFunctions = [
    { id: 'patient_search', name: '환자 등록/검색', icon: '👤', path: '/patients' },
    { id: 'vital_signs', name: 'Vital', icon: '❤️', path: '/vital_signs' },
    { id: 'pacs_viewer', name: 'PACS', icon: '🖼️', path: '/pacs' },
    { id: 'lab_results', name: 'LAB', icon: '🔬', path: '/lab_results' },
  ];

  let roleSpecificFunctions = [];
  if (user.role === ROLES.NURSE) {
    roleSpecificFunctions = [
      { id: 'nurse_tasks', name: '간호사 기능 (투약, 일지)', icon: '🩺', path: '/nurse_tasks' },
    ];
  } else if (user.role === ROLES.DOCTOR) {
    roleSpecificFunctions = [
      { id: 'doctor_tasks', name: '의사 기능 (처방, 진료)', icon: '👨‍⚕️', path: '/doctor_tasks' },
    ];
  } else if (user.role === ROLES.TECHNICIAN) {
    roleSpecificFunctions = [
      { id: 'technician_tasks', name: '검사 기능 (접수, 결과)', icon: '🧪', path: '/technician_tasks' },
    ];
  }

  return (
    <div
      style={{
        borderRight: '1px solid #eee',
        padding: '20px',
        width: '280px',
        backgroundColor: '#f8f9fa',
        height: '100%',
      }}
    >
      <div className="user-profile" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h4>{user.name} 님</h4>
        <p style={{ fontSize: '0.9em', color: '#666' }}>
          {user.department} ({user.role})
        </p>
        <p style={{ fontSize: '0.8em', color: '#888' }}>사원번호: {user.id}</p>
      </div>

      <hr style={{ margin: '20px 0' }} />
      <h5>공통 기능</h5>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {commonFunctions.map((func) => (
          <li
            key={func.id}
            style={{
              padding: '10px',
              marginBottom: '5px',
              borderRadius: '4px',
            }}
          >
            <Link
              to={func.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                padding: '5px 10px',
                borderRadius: '4px',
              }}
            >
              <span style={{ marginRight: '10px' }}>{func.icon}</span>
              {func.name}
            </Link>
          </li>
        ))}
      </ul>

      {roleSpecificFunctions.length > 0 && (
        <>
          <hr style={{ margin: '20px 0' }} />
          <h5>
            {user.role === ROLES.NURSE
              ? '간호사 주요 기능'
              : user.role === ROLES.DOCTOR
              ? '의사 주요 기능'
              : '기타 직원 기능'}
          </h5>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {roleSpecificFunctions.map((func) => (
              <li
                key={func.id}
                style={{
                  padding: '10px',
                  marginBottom: '5px',
                  borderRadius: '4px',
                }}
              >
                <Link
                  to={func.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                    padding: '5px 10px',
                    borderRadius: '4px',
                  }}
                >
                  <span style={{ marginRight: '10px' }}>{func.icon}</span>
                  {func.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ marginTop: '20px' }}>
        <Link
          to="/dashboard"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '10px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            textDecoration: 'none',
          }}
        >
          메인 환자 현황판
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
