import React, { useState, useEffect } from 'react';
import { registerLabResult, fetchLabResultsForPatient } from '../../services/djangoApiService';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

import PacsButton from '../../pacs/PacsButton';
import PacsModal  from '../../pacs/PacsModal';

// Chart.js 모듈 등록 (한번만 하면 됨)
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// 미리 정의된 검사 항목과 단위 (컴포넌트 외부에 두는 것이 좋습니다)
const LAB_TEST_DEFINITIONS = {
    'BUN_chart_mean': { name: 'BUN (혈중요소질소)', unit: 'mg/dL' },
    'CK_lab_mean': { name: 'CK (크레아틴키나제)', unit: 'U/L' },
    'CRP_chart_mean': { name: 'CRP (C-반응성 단백질 (차트))', unit: 'mg/L' },
    'CRP_lab_mean': { name: 'CRP (C-반응성 단백질 (랩))', unit: 'mg/L' },
    'Creatinine_chart_mean': { name: 'Creatinine (크레아티닌 (차트))', unit: 'mg/dL' },
    'Creatinine_lab_mean': { name: 'Creatinine (크레아티닌 (랩))', unit: 'mg/dL' },
    'DBP_art_mean': { name: 'DBP (동맥 이완기 혈압)', unit: 'mmHg' },
    'GCS_mean': { name: 'GCS (의식 수준 평균 점수)', unit: '점' },
    'NIBP_dias_mean': { name: 'NIBP (비침습적 이완기 혈압)', unit: 'mmHg' },
    // 추가 항목들을 여기에 계속 추가하세요.
    // 'Direct Input': { name: '직접 입력', unit: '' } // 직접 입력 옵션을 위한 가상의 항목
};
const LAB_TEST_KEYS = Object.keys(LAB_TEST_DEFINITIONS);

const LabResultsView = ({ selectedPatient, onBackToPatientList }) => {
    const [testName, setTestName] = useState('');
    const [testValue, setTestValue] = useState('');
    const [unit, setUnit] = useState('');
    const [notes, setNotes] = useState('');
    const [recordedAt, setRecordedAt] = useState(''); // 날짜/시간 상태 추가

    const [isTestNameDirectInput, setIsTestNameDirectInput] = useState(false); // 직접 입력 토글 상태
    const [isUnitDirectInput, setIsUnitDirectInput] = useState(false); // 단위 직접 입력 토글 상태

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [patientLabResults, setPatientLabResults] = useState({});

    const [showPacs, setShowPacs] = useState(false);

    const openPacs = () => setShowPacs(true);
    const closePacs = () => setShowPacs(false);

    useEffect(() => {
        if (selectedPatient && selectedPatient.uuid) {
            loadLabResults(selectedPatient.uuid);
        } else {
            setPatientLabResults({});
        }
        // 컴포넌트 마운트 시 현재 날짜와 시간으로 초기화
        const now = new Date();
        const formattedDateTime = now.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM" 형식
        setRecordedAt(formattedDateTime);
    }, [selectedPatient]);

    // testName이 변경될 때 unit을 자동으로 설정하는 useEffect
    useEffect(() => {
        if (!isTestNameDirectInput && LAB_TEST_DEFINITIONS[testName]) {
            setUnit(LAB_TEST_DEFINITIONS[testName].unit);
            setIsUnitDirectInput(false); // 미리 정의된 항목 선택 시 단위 직접 입력 비활성화
        } else if (!isTestNameDirectInput && testName === '') {
            setUnit(''); // 항목 선택이 없으면 단위 초기화
            setIsUnitDirectInput(false);
        } else if (isTestNameDirectInput) {
            // 직접 입력 모드일 때는 단위 직접 입력 활성화
            setIsUnitDirectInput(true);
        }
    }, [testName, isTestNameDirectInput]);

    const loadLabResults = async (patientUuid) => {
        setLoading(true);
        setError(null);
        try {
            const results = await fetchLabResultsForPatient(patientUuid);
            const groupedResults = results.reduce((acc, current) => {
                if (!acc[current.test_name]) {
                    acc[current.test_name] = [];
                }
                acc[current.test_name].push(current);
                return acc;
            }, {});
            setPatientLabResults(groupedResults);
        } catch (err) {
            console.error("Error loading lab results:", err);
            setError("검사 결과 로드 실패: " + (err.message || err.response?.data?.error || '알 수 없는 오류'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');
        setLoading(true);

        if (!selectedPatient || !selectedPatient.uuid) {
            setError("환자가 선택되지 않았습니다.");
            setLoading(false);
            return;
        }
        if (!recordedAt) { // 날짜/시간 필수 검증
            setError("기록 날짜와 시간을 입력해주세요.");
            setLoading(false);
            return;
        }

        try {
            const newLabResult = {
                patient_uuid: selectedPatient.uuid,
                test_name: testName,
                test_value: parseFloat(testValue), 
                unit,
                notes,
                recorded_at: recordedAt // 기록 시간 추가
            };
            await registerLabResult(newLabResult);
            setSuccessMessage('검사 결과가 성공적으로 등록되었습니다.');
            setTestName('');
            setTestValue('');
            setUnit('');
            setNotes('');
            // 등록 후 목록 새로고침 및 현재 날짜/시간으로 다시 초기화
            const now = new Date();
            const formattedDateTime = now.toISOString().slice(0, 16);
            setRecordedAt(formattedDateTime);
            loadLabResults(selectedPatient.uuid); 
        } catch (err) {
            console.error("Error registering lab result:", err);
            setError("검사 결과 등록 실패: " + (err.response?.data?.error || err.message || '알 수 없는 오류'));
        } finally {
            setLoading(false);
        }
    };

    // 그래프 데이터를 생성하는 함수
    const generateChartData = (resultsForSingleTest) => {
        const sortedData = resultsForSingleTest.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
        
        // 차트 레이블을 날짜(YYYY-MM-DD HH:MM)와 값으로, 툴팁을 위한 추가 정보 포함
        const labels = sortedData.map(res => new Date(res.recorded_at).toLocaleString()); 
        const dataValues = sortedData.map(res => res.test_value);

        const displayUnit = sortedData.length > 0 ? sortedData[0].unit || '' : '';

        return {
            labels: labels,
            datasets: [
                {
                    label: `${sortedData.length > 0 ? sortedData[0].test_name : ''} (${displayUnit})`,
                    data: dataValues,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true,
                    // 각 데이터 포인트에 notes 정보를 추가 (Chart.js 툴팁에서 사용)
                    pointCustomData: sortedData.map(res => res.notes), 
                },
            ],
        };
    };

    const chartOptions = (testNameForTitle) => ({
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: `${selectedPatient?.display || '선택된 환자'}의 ${LAB_TEST_DEFINITIONS[testNameForTitle]?.name || testNameForTitle} 검사 결과 추이`, // 정의된 이름 사용
            },
            tooltip: { // 툴팁 커스터마이징
                callbacks: {
                    title: function(context) {
                        return `날짜: ${context[0].label}`; // x축 레이블 (날짜)
                    },
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y;
                        }
                        return label;
                    },
                    afterBody: function(context) { // body 아래에 notes 추가
                        if (context[0].dataset.pointCustomData && context[0].dataIndex !== undefined) {
                            const notes = context[0].dataset.pointCustomData[context[0].dataIndex];
                            return notes ? `비고: ${notes}` : '';
                        }
                        return '';
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: '날짜',
                },
            },
            y: {
                title: {
                    display: true,
                    text: '수치',
                },
                beginAtZero: false,
            },
        },
    });

    if (!selectedPatient) {
        return (
            <div className="lab-results-container" style={{ padding: '20px' }}>
                <h3>LIS 검사 결과</h3>
                <p>환자를 선택해야 검사 결과를 조회하고 입력할 수 있습니다.</p>
                <button onClick={onBackToPatientList} style={{marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px'}}>
                    환자 목록으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="lab-results-container" style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>LIS 검사 결과 - {selectedPatient.display}</h3>
            <p><strong>UUID:</strong> {selectedPatient.uuid}</p>

            <button onClick={onBackToPatientList} style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                환자 목록으로 돌아가기
            </button>

            {/* LIS 수치 입력 폼 */}
            <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px', backgroundColor: 'white' }}>
                <h4>새 검사 결과 입력</h4>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    {/* 검사 항목명 선택/입력 */}
                    <div style={{ gridColumn: 'span 2' }}> {/* 2칸 차지 */}
                        <label>검사 항목명:*</label>
                        {!isTestNameDirectInput ? (
                            <select 
                                value={testName} 
                                onChange={(e) => setTestName(e.target.value)} 
                                required 
                                style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            >
                                <option value="">-- 검사 항목 선택 --</option>
                                {LAB_TEST_KEYS.map(key => (
                                    <option key={key} value={key}>{LAB_TEST_DEFINITIONS[key].name}</option>
                                ))}
                                <option value="DIRECT_INPUT">직접 입력...</option> {/* 직접 입력 선택 옵션 */}
                            </select>
                        ) : (
                            <input 
                                type="text" 
                                value={testName} 
                                onChange={(e) => setTestName(e.target.value)} 
                                required 
                                placeholder="검사 항목명 직접 입력"
                                style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
                            />
                        )}
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsTestNameDirectInput(!isTestNameDirectInput);
                                setTestName(''); // 모드 변경 시 항목 초기화
                                setUnit(''); // 단위도 초기화
                            }}
                            style={{ marginLeft: '10px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                        >
                            {isTestNameDirectInput ? '목록 선택' : '직접 입력'}
                        </button>
                    </div>

                    {/* 검사 수치 */}
                    <div>
                        <label>검사 수치:*</label>
                        <input type="number" step="0.01" value={testValue} onChange={(e) => setTestValue(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                    </div>
                    
                    {/* 단위 */}
                    <div>
                        <label>단위:</label>
                        {isUnitDirectInput ? (
                            <input 
                                type="text" 
                                value={unit} 
                                onChange={(e) => setUnit(e.target.value)} 
                                style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
                                placeholder="단위 직접 입력"
                            />
                        ) : (
                            <input 
                                type="text" 
                                value={unit} 
                                readOnly 
                                style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#e9ecef' }} 
                            />
                        )}
                        {/* 직접 입력 모드에서만 단위 직접 입력 토글 버튼 보여주기 */}
                        {isTestNameDirectInput && (
                            <button 
                                type="button" 
                                onClick={() => setIsUnitDirectInput(!isUnitDirectInput)}
                                style={{ marginLeft: '10px', padding: '8px 12px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.85rem' }}
                            >
                                {isUnitDirectInput ? '자동 설정' : '직접 입력'}
                            </button>
                        )}
                    </div>
                    
                    {/* 날짜/시간 입력 */}
                    <div>
                        <label>기록 날짜/시간:*</label>
                        <input 
                            type="datetime-local" 
                            value={recordedAt} 
                            onChange={(e) => setRecordedAt(e.target.value)} 
                            required 
                            style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
                        />
                    </div>

                    {/* 비고 */}
                    <div style={{ gridColumn: 'span 2' }}> {/* 2칸 차지 */}
                        <label>비고:</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" style={{ width: '95%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}></textarea>
                    </div>

                    <button type="submit" disabled={loading} style={{ gridColumn: 'span 2', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {loading ? '등록 중...' : '검사 결과 등록'}
                    </button>
                     {/* CT/MRI 이미지 등록 버튼 (그리드 1칸 차지) */}
                     <div
                         style={{
                         gridColumn: 'span 1',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'flex-end'
                     }}
                    >
                    <PacsButton onOpen={openPacs} />
                </div>
             </form>
                {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
                {successMessage && <p style={{ color: 'green', marginTop: '10px' }}>{successMessage}</p>}
            </div>

            {/* LIS 수치 그래프 */}
            <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: 'white' }}>
                <h4>검사 결과 추이 그래프</h4>
                {loading && <p>그래프 데이터 로딩 중...</p>}
                {error && !loading && <p style={{ color: 'red' }}>{error}</p>}
                {!loading && Object.keys(patientLabResults).length === 0 && !error && (
                    <p>이 환자에 대한 LIS 검사 결과가 없습니다. 위에 폼을 사용하여 첫 번째 결과를 입력하세요.</p>
                )}
                {!loading && Object.keys(patientLabResults).length > 0 && (
                    <div>
                        {Object.keys(patientLabResults).map(testNameKey => (
                            <div key={testNameKey} style={{ marginBottom: '20px' }}>
                                <Line data={generateChartData(patientLabResults[testNameKey])} options={chartOptions(testNameKey)} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
              {/* PACS 모달 */}
            <PacsModal
                show={showPacs}
                onClose={closePacs}
                patientUuid={selectedPatient.uuid}  // LabResultsView.js 내부의 patient prop 사용
            />
        </div>
    );
};

export default LabResultsView;