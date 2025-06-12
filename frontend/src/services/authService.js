// src/services/authService.js
import { ROLES } from '../constants/roles';

// localStorage에서 사용자 데이터베이스를 로드하거나 새로 초기화합니다.
const loadUsersFromLocalStorage = () => {
  const usersJson = localStorage.getItem('hospitalUsersDB');
  return usersJson ? JSON.parse(usersJson) : {};
};

const saveUsersToLocalStorage = (usersDB) => {
  localStorage.setItem('hospitalUsersDB', JSON.stringify(usersDB));
};

// loginApi: localStorage에서 사용자 정보 조회
export const loginApi = (employeeId, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const usersDB = loadUsersFromLocalStorage();
      const user = usersDB[employeeId];

      if (user && user.password === password) { // 실제 앱에서는 해시된 비밀번호를 비교해야 합니다.
        const { password, ...userData } = user; // 비밀번호는 반환하지 않습니다.
        resolve(userData);
      } else if (user && user.password !== password) {
        reject(new Error('비밀번호가 일치하지 않습니다.'));
      } else {
        reject(new Error('존재하지 않는 사원번호입니다.'));
      }
    }, 300); // 약간의 지연 시뮬레이션
  });
};

// signupApi: localStorage에 사용자 정보 저장
export const signupApi = (userData) => { // userData: { employeeId, name, department, password }
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const usersDB = loadUsersFromLocalStorage();
      const { employeeId, name, department, password } = userData;

      if (usersDB[employeeId]) {
        reject(new Error('이미 존재하는 사원번호입니다.'));
        return;
      }

      let role = '';
      if (employeeId.startsWith('DOC-')) {
        role = ROLES.DOCTOR;
      } else if (employeeId.startsWith('NUR-')) {
        role = ROLES.NURSE;
      } else if (employeeId.startsWith('TEC-')) {
        role = ROLES.TECHNICIAN;
      } else {
        reject(new Error('유효하지 않은 사원번호 형식입니다. (DOC-, NUR-, TEC- 중 하나로 시작해야 합니다)'));
        return;
      }

      const newUser = {
        id: employeeId,
        name,
        role,
        department,
        password, // 실제 앱에서는 해시해서 저장해야 합니다.
      };

      usersDB[employeeId] = newUser;
      saveUsersToLocalStorage(usersDB);
      console.log('New user registered to localStorage:', usersDB);

      const { password: _, ...returnUserData } = newUser; // 비밀번호 제외하고 반환
      resolve(returnUserData);
    }, 300);
  });
};