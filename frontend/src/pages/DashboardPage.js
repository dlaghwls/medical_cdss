// frontend/src/pages/DashboardPage.js

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import MainView from '../components/Common/MainView';
import { useAuth } from '../contexts/AuthContext'; 
import { fetchMedicalStaff, fetchChatMessages, sendMessage as sendHttpMessage } from '../services/djangoApiService'; 

// MedicalStaffListModal 컴포넌트 정의
const MedicalStaffListModal = ({ isOpen, onClose, staffList, onSelectStaff }) => {
    if (!isOpen) return null; 

    return (
        <div style={{
            position: 'fixed',
            bottom: '100px', 
            right: '20px',
            width: '300px',
            maxHeight: '400px',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            zIndex: 1000,
            overflowY: 'auto'
        }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>의료진 목록</h4>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                {staffList.length === 0 ? (
                    <li style={{ padding: '10px 15px', color: '#666' }}>등록된 의료진이 없습니다.</li>
                ) : (
                    staffList.map(staff => (
                        // ★★★ key에 staff.uuid 대신 staff.id 사용 (필요시) ★★★
                        // 그러나 백엔드의 StaffSerializer는 uuid를 반환하므로 staff.uuid가 존재해야 함.
                        // 이 key는 임시로 그대로 둡니다. 백엔드 StaffSerializer는 uuid를 반환해야 합니다.
                        <li 
                            key={staff.uuid} 
                            onClick={() => onSelectStaff(staff)} 
                            style={{ 
                                padding: '10px 15px', 
                                borderBottom: '1px solid #eee', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'background-color 0.2s ease-in-out'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div style={{
                                width: '30px', height: '30px', borderRadius: '50%', 
                                backgroundColor: '#007bff', color: 'white', 
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                marginRight: '10px', fontWeight: 'bold'
                            }}>
                                {staff.display ? staff.display[0] : 'U'}
                            </div>
                            <span>{staff.display || `Unknown User (${staff.uuid.substring(0,4)}...)`}</span>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

// 채팅창 컴포넌트
const ChatWindow = ({ isOpen, onClose, selectedStaff, messages, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null); 

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollInView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom(); 
    }, [messages, isOpen]);

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(selectedStaff.uuid, newMessage); 
            setNewMessage(''); 
        }
    };

    if (!isOpen || !selectedStaff) return null; 

    return (
        <div style={{
            position: 'fixed',
            bottom: '100px', 
            right: '20px',
            width: '350px',
            height: '450px',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#007bff', color: 'white', borderRadius: '8px 8px 0 0' }}>
                <h4 style={{ margin: 0, color: 'white' }}>{selectedStaff.display || '대화 상대'}</h4>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'white' }}>×</button>
            </div>
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column' }}>
                {messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666' }}>아직 대화가 없습니다. 메시지를 보내세요!</p>
                ) : (
                    messages.map((msg, index) => (
                        <div 
                            key={msg.uuid || index} 
                            style={{ 
                                alignSelf: msg.isMe ? 'flex-end' : 'flex-start',
                                backgroundColor: msg.isMe ? '#dcf8c6' : '#e0e0e0',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                marginBottom: '8px',
                                maxWidth: '80%',
                                wordWrap: 'break-word'
                            }}
                        >
                            <small style={{ color: '#888', fontSize: '0.7em', marginBottom: '4px', display: 'block', textAlign: msg.isMe ? 'right' : 'left' }}>
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                            </small>
                            {msg.content}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
                    placeholder="메시지 입력..." 
                    style={{ flexGrow: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button onClick={handleSend} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    전송
                </button>
            </div>
        </div>
    );
};


function DashboardPage() {
    const { user, isLoading, logout } = useAuth(); 
    const navigate = useNavigate(); 
    const location = useLocation(); 

    const [currentViewId, setCurrentViewId] = useState(() => {
        const pathSegments = location.pathname.split('/');
        return pathSegments[pathSegments.length - 1] || 'main_dashboard';
    });

    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false); 
    const [medicalStaffList, setMedicalStaffList] = useState([]);
    const [selectedChatStaff, setSelectedChatStaff] = useState(null);
    const [chatMessages, setChatMessages] = useState([]); 

    const pollingIntervalRef = useRef(null);

    const handleViewChange = (viewId) => {
        setCurrentViewId(viewId);
        navigate(`/dashboard/${viewId}`); 
    };

    const loadMedicalStaff = async () => {
        try {
            // ★★★ user.uuid 대신 user.id 사용 (임시) ★★★
            if (!user || !user.id || isLoading) { 
                console.warn("사용자 정보 (ID)가 아직 로드되지 않았거나 로딩 중입니다. 의료진 목록을 불러올 수 없습니다.");
                return;
            }
            console.log("의료진 목록 불러오기 시도 - user.id:", user.id); 
            const staff = await fetchMedicalStaff(); 
            // 현재 로그인된 사용자를 목록에서 제외하고 필터링 (user.id 사용)
            const filteredStaff = staff.filter(s => s.uuid && s.uuid !== user.id); // ★★★ s.uuid !== user.id ★★★
            setMedicalStaffList(filteredStaff);
        } catch (error) {
            console.error("의료진 목록 불러오기 실패:", error);
        }
    };

    const toggleMessageModal = () => {
        setIsMessageModalOpen(prev => !prev);
        setSelectedChatStaff(null); 

        console.log("M 버튼 클릭됨 - isMessageModalOpen:", !isMessageModalOpen, "user:", user, "isLoading:", isLoading);

        if (!isMessageModalOpen) { 
            loadMedicalStaff(); 
        }
    };

    const loadMessages = async (otherUserUuid) => {
        // ★★★ user.uuid 대신 user.id 사용 (임시) ★★★
        if (!user || !user.id || !otherUserUuid || isLoading) return; 
        try {
            const messages = await fetchChatMessages(otherUserUuid);
            const formattedMessages = messages.map(msg => ({
                uuid: msg.uuid,
                content: msg.content,
                isMe: msg.sender.uuid === user.id, // ★★★ msg.sender.uuid === user.id ★★★
                timestamp: msg.timestamp,
                sender_display: msg.sender_display
            }));
            setChatMessages(formattedMessages);
        } catch (error) {
            console.error("채팅 메시지 로드 실패:", error);
        }
    };

    const handleSelectChatStaff = (staff) => {
        setSelectedChatStaff(staff);
        setIsMessageModalOpen(false); 

        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        setChatMessages([]); 
        loadMessages(staff.uuid); // 여기는 staff.uuid (백엔드 StaffSerializer는 uuid 반환 기대)

        pollingIntervalRef.current = setInterval(() => {
            loadMessages(staff.uuid);
        }, 1000); 
    };

    const handleSendMessage = async (receiverUuid, messageContent) => {
        // ★★★ user.uuid 대신 user.id 사용 (임시) ★★★
        if (!user || !user.id || !receiverUuid || !messageContent.trim() || isLoading) return; 
        try {
            const sentMessage = await sendHttpMessage({
                sender_uuid: user.id,      // ★★★ user.uuid 대신 user.id ★★★
                receiver_uuid: receiverUuid, 
                content: messageContent,     
            });
            console.log("메시지 전송 성공:", sentMessage);
            loadMessages(receiverUuid); 
        } catch (error) {
            console.error("메시지 전송 실패:", error);
        }
    };

    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                console.log("Polling interval cleared.");
            }
        };
    }, [selectedChatStaff, user, isLoading]); 

    const navButtonStyle = (isActive) => ({
        width: '100%',
        padding: '10px 15px',
        textAlign: 'left',
        backgroundColor: isActive ? '#0056b3' : 'transparent',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: isActive ? 'bold' : 'normal',
        transition: 'background-color 0.2s'
    });

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem' }}>사용자 정보 로딩 중...</div>;
    }

    if (!user) {
        console.error("User is null but not loading. Redirecting to login.");
        logout(); 
        return <Navigate to="/login" replace />; 
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* LNB 메뉴 (사이드바) */}
            <nav style={{ width: '200px', backgroundColor: '#343a40', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <h2 style={{ color: '#007bff', marginBottom: '30px' }}>StrokeCare+</h2>
                <div style={{ marginBottom: '30px' }}>
                    <p style={{ margin: '0', fontSize: '1.1rem', fontWeight: 'bold' }}>{user?.name || '사용자'}</p>
                    <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#ccc' }}>{user?.role || '역할'}</p>
                </div>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    <li style={{ marginBottom: '10px' }}><button onClick={() => handleViewChange('main_dashboard')} style={navButtonStyle(currentViewId === 'main_dashboard')}>메인 환자 현황판</button></li>
                    <li style={{ marginBottom: '10px' }}><button onClick={() => handleViewChange('patient_search')} style={navButtonStyle(currentViewId === 'patient_search')}>환자 등록/검색</button></li>
                    <li style={{ marginBottom: '10px' }}><button onClick={() => handleViewChange('vital_signs')} style={navButtonStyle(currentViewId === 'vital_signs')}>Vital</button></li>
                    <li style={{ marginBottom: '10px' }}><button onClick={() => handleViewChange('pacs_viewer')} style={navButtonStyle(currentViewId === 'pacs_viewer')}>PACS</button></li>
                    <li style={{ marginBottom: '10px' }}><button onClick={() => handleViewChange('lab_results')} style={navButtonStyle(currentViewId === 'lab_results')}>LAB</button></li>
                    <li style={{ marginBottom: '10px' }}><button onClick={() => handleViewChange('doctor_tasks')} style={navButtonStyle(currentViewId === 'doctor_tasks')}>의사 기능 (처방, 진료)</button></li>
                </ul>
                <div style={{ marginTop: 'auto' }}>
                    <button onClick={logout} style={{ ...navButtonStyle(false), backgroundColor: '#dc3545' }}>로그아웃</button>
                </div>
            </nav>

            {/* 메인 콘텐츠 영역 */}
            <MainView 
                currentViewId={currentViewId} 
                user={user} 
                onViewChange={handleViewChange} 
            />

            {/* 우측 하단 플로팅 'M' 버튼 */}
            <button 
                onClick={toggleMessageModal} 
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#007bff',
                    color: 'white', 
                    fontSize: '2rem', // 폰트 크기 약간 증가
                    fontWeight: 'bold',
                    border: 'none',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    zIndex: 1000,
                    display: 'flex', 
                    justifyContent: 'center',
                    alignItems: 'center',
                    lineHeight: '1' 
                }}
            >
                M
            </button>

            {/* 의료진 목록 모달 */}
            <MedicalStaffListModal 
                isOpen={isMessageModalOpen && !selectedChatStaff} 
                onClose={() => setIsMessageModalOpen(false)}
                staffList={medicalStaffList}
                onSelectStaff={handleSelectChatStaff}
            />

            {/* 채팅창 */}
            <ChatWindow
                isOpen={!!selectedChatStaff} 
                onClose={() => setSelectedChatStaff(null)}
                selectedStaff={selectedChatStaff}
                messages={chatMessages}
                onSendMessage={handleSendMessage} 
            />
        </div>
    );
}

export default DashboardPage;