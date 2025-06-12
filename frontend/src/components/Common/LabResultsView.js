import React, { useState, useEffect } from 'react';
// --- (API 서비스 임포트) ---
// 실제 구현 시, 아래와 같이 환자별 상세 정보를 가져오는 함수가 djangoApiService.js 파일에 필요합니다.
// import { registerLabResult, fetchLabResultsForPatient, fetchSod2ForPatient, fetchComplicationsForPatient } from '../../services/djangoApiService';
// import { registerLabResult, fetchLabResultsForPatient } from '../../services/djangoApiService';
import { 
    registerLabResult, 
    fetchLabResultsForPatient,
    registerStrokeInfo,                 // ★ 추가
    registerComplicationsAndMedications,    // ★ 추가
    fetchStrokeInfoHistory,             // ★ 추가
    fetchComplicationsHistory           // ★ 추가
} from '../../services/djangoApiService';
import { fetchPatientStudies, uploadDicomFile } from '../../services/pacsApiService';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import StudiesModal from '../pacs/StudiesModal';

// Chart.js 모듈 등록 (한번만 하면 됨)
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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
};
const LAB_TEST_KEYS = Object.keys(LAB_TEST_DEFINITIONS);


// --- [추가] 모달 컴포넌트 ---
// 다양한 정보를 보여주기 위한 재사용 가능한 모달
const InfoModal = ({ title, records, recordType, onClose, formatRecord }) => {
    const [sortOrder, setSortOrder] = useState('newest');
    const [sortedRecords, setSortedRecords] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);

    // 정렬 순서나 원본 데이터가 바뀌면 정렬을 다시 수행
    useEffect(() => {
        let tempRecords = [...records];
        switch (sortOrder) {
            case 'oldest':
                tempRecords.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
                break;
            case 'nihss_high':
                if (recordType === 'sod2') {
                    // stroke_info 객체 안의 nihss_score를 기준으로 정렬
                    tempRecords.sort((a, b) => (b.stroke_info?.nihss_score || 0) - (a.stroke_info?.nihss_score || 0));
                }
                break;
            case 'newest':
            default:
                tempRecords.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
                break;
        }
        setSortedRecords(tempRecords);
        setCurrentPage(0); // 정렬이 바뀌면 첫 페이지로 리셋
    }, [records, sortOrder, recordType]);

    const currentRecord = sortedRecords.length > 0 ? sortedRecords[currentPage] : null;
    const formattedData = currentRecord ? formatRecord(currentRecord) : [];

    // 모달 기본 틀
    const renderModalContent = (content) => (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                {content}
            </div>
        </div>
    );

    if (records.length === 0) {
        return renderModalContent(
            <>
                <h3 style={{ marginTop: 0 }}>{title}</h3>
                <p>등록된 정보가 없습니다.</p>
                <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>닫기</button>
            </>
        );
    }

    return renderModalContent(
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h3>
                <div>
                    <label htmlFor="sort-order" style={{ marginRight: '10px', fontSize: '14px' }}>정렬:</label>
                    <select id="sort-order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '5px', borderRadius: '4px' }}>
                        <option value="newest">최신순</option>
                        <option value="oldest">오래된 순</option>
                        {recordType === 'sod2' && <option value="nihss_high">NIHSS 점수 높은 순</option>}
                    </select>
                </div>
            </div>

            <div style={{ overflowY: 'auto', flexGrow: 1, padding: '15px 0' }}>
                {currentRecord ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {formattedData.map((item, index) => (
                            <li key={index} style={{ borderBottom: '1px solid #f0f0f0', padding: '10px 5px', display: 'flex' }}>
                                <strong style={{ minWidth: '150px', flexShrink: 0 }}>{item.label}:</strong>
                                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{item.value}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>표시할 데이터가 없습니다.</p>
                )}
            </div>

            <div style={{ paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    닫기
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                        이전
                    </button>
                    <span>페이지 {currentPage + 1} / {sortedRecords.length}</span>
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= sortedRecords.length - 1} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                        다음
                    </button>
                </div>
            </div>
        </>
    );
};



const LabResultsView = ({ selectedPatient, onBackToPatientList }) => {
    const [testName, setTestName] = useState('');
    const [testValue, setTestValue] = useState('');
    const [unit, setUnit] = useState('');
    const [notes, setNotes] = useState('');
    const [recordedAt, setRecordedAt] = useState('');

    const [isTestNameDirectInput, setIsTestNameDirectInput] = useState(false);
    const [isUnitDirectInput, setIsUnitDirectInput] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [patientLabResults, setPatientLabResults] = useState({});

    const [activeForm, setActiveForm] = useState('mortality'); // 'mortality', 'sod2', 'complications', 'lis'

    // 사망률 예측 관련 상태
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [heartRate, setHeartRate] = useState('');
    const [systolicBp, setSystolicBp] = useState('');
    const [diastolicBp, setDiastolicBp] = useState('');
    const [temperature, setTemperature] = useState('');
    const [respiratoryRate, setRespiratoryRate] = useState('');
    const [oxygenSaturation, setOxygenSaturation] = useState('');
    const [wbc, setWbc] = useState('');
    const [hemoglobin, setHemoglobin] = useState('');
    const [creatinine, setCreatinine] = useState('');
    const [bun, setBun] = useState('');
    const [glucose, setGlucose] = useState('');
    const [sodium, setSodium] = useState('');
    const [potassium, setPotassium] = useState('');

    // 합병증 관련 상태 (체크박스)
    const [complications, setComplications] = useState({
        sepsis: false,
        respiratory_failure: false,
        deep_vein_thrombosis: false,
        pulmonary_embolism: false,
        urinary_tract_infection: false,
        gastrointestinal_bleeding: false,
    });

    // 투약 정보 관련 상태 (체크박스)
    const [medications, setMedications] = useState({
        anticoagulant_flag: false,
        antiplatelet_flag: false,
        thrombolytic_flag: false,
        antihypertensive_flag: false,
        statin_flag: false,
        antibiotic_flag: false,
        vasopressor_flag: false,
    });

    // SOD2 (뇌졸중 특화 정보) 관련 상태
    const [strokeType, setStrokeType] = useState('');
    const [nihssScore, setNihssScore] = useState('');
    const [reperfusionTreatment, setReperfusionTreatment] = useState(false);
    const [reperfusionTime, setReperfusionTime] = useState('');
    const [strokeDate, setStrokeDate] = useState('');
    const [hoursAfterStroke, setHoursAfterStroke] = useState('');

    // --- [추가] 모달 및 데이터 조회를 위한 상태 ---
    const [modalInfo, setModalInfo] = useState({
        isOpen: false,
        title: '',
        records: [],
        recordType: '',
        formatRecord: () => []
    });
    const [viewLoading, setViewLoading] = useState(false);


    useEffect(() => {
        if (selectedPatient && selectedPatient.uuid) {
            loadLabResults(selectedPatient.uuid);
        } else {
            setPatientLabResults({});
        }
        const now = new Date();
        const formattedDateTime = now.toISOString().slice(0, 16);
        setRecordedAt(formattedDateTime);
    }, [selectedPatient]);

    useEffect(() => {
        if (!isTestNameDirectInput && LAB_TEST_DEFINITIONS[testName]) {
            setUnit(LAB_TEST_DEFINITIONS[testName].unit);
            setIsUnitDirectInput(false);
        } else if (!isTestNameDirectInput && testName === '') {
            setUnit('');
            setIsUnitDirectInput(false);
        } else if (isTestNameDirectInput) {
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
 // --- [추가] SOD2 정보 포맷팅 함수 ---
    const formatSod2Record = (record) => [
        { label: '뇌졸중 유형', value: record.stroke_info?.stroke_type === 'ischemic_reperfusion' ? '허혈성 재관류' : (record.stroke_info?.stroke_type || 'N/A') },
        { label: 'NIHSS 점수', value: `${record.stroke_info?.nihss_score ?? 'N/A'} 점` },
        { label: '재관류 치료 여부', value: record.stroke_info?.reperfusion_treatment ? '예' : '아니오' },
        { label: '재관류 시간', value: record.stroke_info?.reperfusion_time ? `${record.stroke_info.reperfusion_time} 시간` : 'N/A' },
        { label: '뇌졸중 발생일', value: record.stroke_info?.stroke_date || 'N/A' },
        { label: '뇌졸중 후 경과 시간', value: `${record.stroke_info?.hours_after_stroke ?? 'N/A'} 시간` },
        { label: '기록 시각', value: new Date(record.recorded_at).toLocaleString() },
        { label: '비고', value: record.notes || '없음' }
    ];

    // --- [추가] 합병증/투약 정보 포맷팅 함수 ---
    const formatComplicationsRecord = (record) => {
        const complicationLabels = { sepsis: '패혈증', respiratory_failure: '호흡부전', deep_vein_thrombosis: '심부정맥혈전증', pulmonary_embolism: '폐색전증', urinary_tract_infection: '요로감염', gastrointestinal_bleeding: '위장관 출혈' };
        const medicationLabels = { anticoagulant_flag: '항응고제', antiplatelet_flag: '항혈소판제', thrombolytic_flag: '혈전용해제', antihypertensive_flag: '항고혈압제', statin_flag: '스타틴', antibiotic_flag: '항생제', vasopressor_flag: '승압제' };
        
        const complicationEntries = Object.entries(record.complications || {}).filter(([, value]) => value).map(([key]) => complicationLabels[key]);
        const medicationEntries = Object.entries(record.medications || {}).filter(([, value]) => value).map(([key]) => medicationLabels[key]);

        return [
            { label: '조회된 합병증', value: complicationEntries.length > 0 ? complicationEntries.join(', ') : '해당 없음' },
            { label: '처방된 약물', value: medicationEntries.length > 0 ? medicationEntries.join(', ') : '해당 없음' },
            { label: '기록 시각', value: new Date(record.recorded_at).toLocaleString() },
            { label: '비고', value: record.notes || '없음' }
        ];
    };
    // --- [추가] SOD2 자동 비고 생성 함수 ---
    const generateSod2Note = (newRecord, existingRecords) => {
        if (existingRecords.length === 0) {
            return `첫 SOD2 기록입니다. NIHSS 점수 ${newRecord.stroke_info.nihss_score}점으로 등록되었습니다.`;
        }
        const lastRecord = existingRecords[existingRecords.length - 1];
        const lastScore = lastRecord.stroke_info.nihss_score;
        const newScore = newRecord.stroke_info.nihss_score;

        let note = `이전 기록 대비 NIHSS 점수가 ${lastScore}점에서 ${newScore}점으로 변경되었습니다.`;

        if (newScore > lastScore) {
            note += " (점수 상승)";
        } else if (newScore < lastScore) {
            note += " (점수 감소/호전)";
        } else {
            note += " (변동 없음)";
        }
        return note;
    };

    // --- [추가] 합병증/투약 자동 비고 생성 함수 ---
    const generateComplicationsNote = (newRecord, existingRecords) => {
        const complicationLabels = { sepsis: '패혈증', respiratory_failure: '호흡부전', deep_vein_thrombosis: '심부정맥혈전증', pulmonary_embolism: '폐색전증', urinary_tract_infection: '요로감염', gastrointestinal_bleeding: '위장관 출혈' };
        const medicationLabels = { anticoagulant_flag: '항응고제', antiplatelet_flag: '항혈소판제', thrombolytic_flag: '혈전용해제', antihypertensive_flag: '항고혈압제', statin_flag: '스타틴', antibiotic_flag: '항생제', vasopressor_flag: '승압제' };

        if (existingRecords.length === 0) {
            const initialComplications = Object.entries(newRecord.complications).filter(([,v]) => v).map(([k]) => complicationLabels[k]).join(', ');
            const initialMedications = Object.entries(newRecord.medications).filter(([,v]) => v).map(([k]) => medicationLabels[k]).join(', ');
            let note = "첫 기록입니다.";
            if (initialComplications) note += `\n- 진단: ${initialComplications}`;
            if (initialMedications) note += `\n- 투약: ${initialMedications}`;
            return note;
        }

        const lastRecord = existingRecords[existingRecords.length - 1];
        const changes = [];

        // 합병증 변화 감지
        for (const key in complicationLabels) {
            if (newRecord.complications[key] && !lastRecord.complications[key]) {
                changes.push(`${complicationLabels[key]} 새로 진단됨.`);
            } else if (!newRecord.complications[key] && lastRecord.complications[key]) {
                changes.push(`${complicationLabels[key]} 호전/해결됨.`);
            }
        }
        
        // 투약 정보 변화 감지
        for (const key in medicationLabels) {
            if (newRecord.medications[key] && !lastRecord.medications[key]) {
                changes.push(`${medicationLabels[key]} 투약 시작.`);
            } else if (!newRecord.medications[key] && lastRecord.medications[key]) {
                changes.push(`${medicationLabels[key]} 투약 중단.`);
            }
        }

        if (changes.length === 0) {
            return "이전 기록과 비교하여 변동 사항 없음.";
        }

        return "이전 기록 대비 변경사항:\n- " + changes.join('\n- ');
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
        if (!recordedAt) {
            setError("기록 날짜와 시간을 입력해주세요.");
            setLoading(false);
            return;
        }

        try {
            let submissionData = {};
            let apiCallFunction;

            if (activeForm === 'sod2') {
                let finalNotes = notes;
                // ★★★ 비고가 비어있을 때만 자동 생성 로직 실행 ★★★
                if (!notes) {
                    try {
                        const existingRecords = await fetchStrokeInfoHistory(selectedPatient.uuid);
                        const newRecordForNote = { stroke_info: { nihss_score: parseInt(nihssScore) || 0 } };
                        finalNotes = generateSod2Note(newRecordForNote, existingRecords);
                    } catch (err) {
                        console.error("비고 생성을 위한 데이터 조회 실패:", err);
                        finalNotes = "첫 기록이거나 이전 기록 조회에 실패했습니다.";
                    }
                }
                submissionData = {
                    patient: selectedPatient.uuid,
                    stroke_info: { stroke_type: strokeType, nihss_score: parseInt(nihssScore) || 0, reperfusion_treatment: reperfusionTreatment, reperfusion_time: parseFloat(reperfusionTime) || null, stroke_date: strokeDate, hours_after_stroke: parseFloat(hoursAfterStroke) || null },
                    notes: finalNotes, // 자동 생성되거나 직접 입력된 비고를 사용
                    recorded_at: recordedAt
                };
                apiCallFunction = () => registerStrokeInfo(submissionData);

            } else if (activeForm === 'complications') {
                let finalNotes = notes;
                 // ★★★ 비고가 비어있을 때만 자동 생성 로직 실행 ★★★
                if (!notes) {
                    try {
                        const existingRecords = await fetchComplicationsHistory(selectedPatient.uuid);
                        const newRecordForNote = { complications, medications };
                        finalNotes = generateComplicationsNote(newRecordForNote, existingRecords);
                    } catch (err) {
                        console.error("비고 생성을 위한 데이터 조회 실패:", err);
                        finalNotes = "첫 기록이거나 이전 기록 조회에 실패했습니다.";
                    }
                }
                submissionData = {
                    patient: selectedPatient.uuid,
                    complications: complications,
                    medications: medications,
                    notes: finalNotes, // 자동 생성되거나 직접 입력된 비고를 사용
                    recorded_at: recordedAt
                };
                apiCallFunction = () => registerComplicationsAndMedications(submissionData);

            } else if (activeForm === 'mortality') {
                submissionData = { /* ... */ };
                apiCallFunction = () => new Promise(resolve => console.log("Mortality form not connected to API yet."));
            } else { // lis
                submissionData = {
                    patient: selectedPatient.uuid, test_name: testName, test_value: parseFloat(testValue), unit, notes, recorded_at: recordedAt
                };
                apiCallFunction = () => registerLabResult(submissionData);
            }

            await apiCallFunction();
            setSuccessMessage('데이터가 성공적으로 등록되었습니다.');
            
            // 폼 필드 초기화 (기존과 동일)
            if (activeForm === 'mortality') {
                setGender(''); setAge(''); setHeartRate(''); setSystolicBp(''); setDiastolicBp(''); setTemperature(''); setRespiratoryRate(''); setOxygenSaturation(''); setWbc(''); setHemoglobin(''); setCreatinine(''); setBun(''); setGlucose(''); setSodium(''); setPotassium('');
            } else if (activeForm === 'sod2') {
                setStrokeType(''); setNihssScore(''); setReperfusionTreatment(false); setReperfusionTime(''); setStrokeDate(''); setHoursAfterStroke('');
            } else if (activeForm === 'complications') {
                setComplications({ sepsis: false, respiratory_failure: false, deep_vein_thrombosis: false, pulmonary_embolism: false, urinary_tract_infection: false, gastrointestinal_bleeding: false });
                setMedications({ anticoagulant_flag: false, antiplatelet_flag: false, thrombolytic_flag: false, antihypertensive_flag: false, statin_flag: false, antibiotic_flag: false, vasopressor_flag: false });
            } else if (activeForm === 'lis') {
                setTestName(''); setTestValue('');
                loadLabResults(selectedPatient.uuid);
            }
            
            setNotes('');
            setUnit('');
            const now = new Date();
            const formattedDateTime = now.toISOString().slice(0, 16);
            setRecordedAt(formattedDateTime);

        } catch (err) {
            console.error("Error registering data:", err);
            const errorMsg = err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message || '알 수 없는 오류';
            setError("데이터 등록 실패: " + errorMsg);
        } finally {
            setLoading(false);
        }
    };
    // --- [추가] SOD2 정보 조회 처리 함수 ---
    const handleViewSod2 = async () => {
        setViewLoading(true);
        setError(null);
        try {
            // ★★★ 핵심 변경: 로컬 상태 대신 실제 API 호출
            const results = await fetchStrokeInfoHistory(selectedPatient.uuid);
            console.log(`Fetched ${results.length} SOD2 records from API.`);
            
            setModalInfo({ isOpen: true, title: `${selectedPatient.display}님의 SOD2 정보`, records: results, recordType: 'sod2', formatRecord: formatSod2Record });
        } catch (err) {
            console.error("Error fetching SOD2 data:", err);
            setError("SOD2 정보 조회 실패: " + (err.message || '알 수 없는 오류'));
        } finally {
            setViewLoading(false);
        }
    };

    const handleViewComplications = async () => {
        setViewLoading(true);
        setError(null);
        try {
            // ★★★ 핵심 변경: 로컬 상태 대신 실제 API 호출
            const results = await fetchComplicationsHistory(selectedPatient.uuid);
            console.log(`Fetched ${results.length} Complication records from API.`);

            setModalInfo({ isOpen: true, title: `${selectedPatient.display}님의 합병증 및 투약 정보`, records: results, recordType: 'complications', formatRecord: formatComplicationsRecord });
        } catch (err) {
            console.error("Error fetching complication data:", err);
            setError("합병증/투약 정보 조회 실패: " + (err.message || '알 수 없는 오류'));
        } finally {
            setViewLoading(false);
        }
    };

    const generateChartData = (resultsForSingleTest) => {
        const sortedData = resultsForSingleTest.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

        const labels = sortedData.map(res => new Date(res.recorded_at).toLocaleString());
        const dataValues = sortedData.map(res => res.test_value);

        const displayUnit = sortedData.length > 0 ? sortedData[0].unit || '' : '';

        return {
            labels: labels,
            datasets: [
                {
                    label: `${sortedData.length > 0 ? LAB_TEST_DEFINITIONS[sortedData[0].test_name]?.name || sortedData[0].test_name : ''} (${displayUnit})`,
                    data: dataValues,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true,
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
                text: `${selectedPatient?.display || '선택된 환자'}의 ${LAB_TEST_DEFINITIONS[testNameForTitle]?.name || testNameForTitle} 검사 결과 추이`,
            },
            tooltip: {
                callbacks: {
                    title: function (context) {
                        return `날짜: ${context[0].label}`;
                    },
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y;
                        }
                        return label;
                    },
                    afterBody: function (context) {
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

    const handleComplicationChange = (e) => {
        setComplications({
            ...complications,
            [e.target.name]: e.target.checked,
        });
    };

    const handleMedicationChange = (e) => {
        setMedications({
            ...medications,
            [e.target.name]: e.target.checked,
        });
    };

    if (!selectedPatient) {
        return (
            <div className="lab-results-container" style={{ padding: '20px' }}>
                <h3>LIS 검사 결과</h3>
                <p>환자를 선택해야 검사 결과를 조회하고 입력할 수 있습니다.</p>
                <button onClick={onBackToPatientList} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                    환자 목록으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="lab-results-container" style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>

            {/* --- [추가] 모달 렌더링 --- */}
            {modalInfo.isOpen && (
                <InfoModal
                    title={modalInfo.title}
                    records={modalInfo.records}
                    recordType={modalInfo.recordType}
                    onClose={() => setModalInfo({ isOpen: false, title: '', records: [], recordType: '', formatRecord: () => [] })}
                    formatRecord={modalInfo.formatRecord}
                />
            )}

            <h3>LIS 검사 결과 - {selectedPatient.display}</h3>
            <p><strong>UUID:</strong> {selectedPatient.uuid}</p>

            <button onClick={onBackToPatientList} style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                환자 목록으로 돌아가기
            </button>

            {/* --- [수정] 정보 조회 버튼 그룹 추가 --- */}
            <div style={{ marginBottom: '20px', borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '15px 0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={handleViewSod2}
                    disabled={viewLoading}
                    style={{ padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {viewLoading ? '조회 중...' : 'SOD2 정보 열람'}
                </button>
                <button
                    onClick={handleViewComplications}
                    disabled={viewLoading}
                    style={{ padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {viewLoading ? '조회 중...' : '합병증/투약 정보 열람'}
                </button>
            </div>


            {/* 새로운 폼 선택 버튼들 */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => setActiveForm('mortality')}
                    style={{ padding: '10px 15px', backgroundColor: activeForm === 'mortality' ? '#0056b3' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    사망률 예측 입력
                </button>
                <button
                    onClick={() => setActiveForm('sod2')}
                    style={{ padding: '10px 15px', backgroundColor: activeForm === 'sod2' ? '#0056b3' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    SOD2 (뇌졸중) 정보 입력
                </button>
                <button
                    onClick={() => setActiveForm('complications')}
                    style={{ padding: '10px 15px', backgroundColor: activeForm === 'complications' ? '#0056b3' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    합병증 및 투약 정보 입력
                </button>
                <button
                    onClick={() => setActiveForm('lis')}
                    style={{ padding: '10px 15px', backgroundColor: activeForm === 'lis' ? '#0056b3' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    LIS 검사 결과 입력
                </button>
            </div>

            {/* 동적으로 렌더링되는 입력 폼 */}
            <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px', backgroundColor: 'white' }}>
                <h4>
                    {activeForm === 'mortality' && '새 사망률 예측 데이터 입력'}
                    {activeForm === 'sod2' && '새 SOD2 (뇌졸중 특화) 정보 입력'}
                    {activeForm === 'complications' && '새 합병증 및 투약 정보 입력'}
                    {activeForm === 'lis' && '새 LIS 검사 결과 입력'}
                </h4>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    {activeForm === 'mortality' && (
                        <>
                            {/* 기본 정보 */}
                            <div>
                                <label>성별:</label>
                                <select value={gender} onChange={(e) => setGender(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <option value="">선택</option>
                                    <option value="M">남성</option>
                                    <option value="F">여성</option>
                                </select>
                            </div>
                            <div>
                                <label>나이:</label>
                                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>

                            {/* 활력 징후 */}
                            <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                                <h4>활력 징후</h4>
                            </div>
                            <div>
                                <label>심박수 (60-100):</label>
                                <input type="number" step="0.1" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>수축기 혈압 (90-140):</label>
                                <input type="number" step="0.1" value={systolicBp} onChange={(e) => setSystolicBp(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>이완기 혈압 (60-90):</label>
                                <input type="number" step="0.1" value={diastolicBp} onChange={(e) => setDiastolicBp(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>체온 (36-37.5°C):</label>
                                <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>호흡수 (12-20):</label>
                                <input type="number" step="0.1" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>산소포화도 (95-100%):</label>
                                <input type="number" step="0.1" value={oxygenSaturation} onChange={(e) => setOxygenSaturation(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>

                            {/* 주요 혈액 검사 */}
                            <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                                <h4>주요 혈액 검사</h4>
                            </div>
                            <div>
                                <label>백혈구 (4-11 × 10³/μL):</label>
                                <input type="number" step="0.1" value={wbc} onChange={(e) => setWbc(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>헤모글로빈 (12-16 g/dL):</label>
                                <input type="number" step="0.1" value={hemoglobin} onChange={(e) => setHemoglobin(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>크레아티닌 (0.7-1.3 mg/dL):</label>
                                <input type="number" step="0.01" value={creatinine} onChange={(e) => setCreatinine(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>혈중요소질소 (7-20 mg/dL):</label>
                                <input type="number" step="0.1" value={bun} onChange={(e) => setBun(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>혈당 (70-100 mg/dL):</label>
                                <input type="number" step="0.1" value={glucose} onChange={(e) => setGlucose(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>나트륨 (136-145 mEq/L):</label>
                                <input type="number" step="0.1" value={sodium} onChange={(e) => setSodium(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>칼륨 (3.5-5.0 mEq/L):</label>
                                <input type="number" step="0.1" value={potassium} onChange={(e) => setPotassium(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                        </>
                    )}

                    {activeForm === 'sod2' && (
                        <>
                            {/* 뇌졸중 특화 정보 */}
                            <div>
                                <label>뇌졸중 유형:</label>
                                <select value={strokeType} onChange={(e) => setStrokeType(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <option value="">선택</option>
                                    <option value="ischemic_reperfusion">허혈성 재관류</option>
                                    <option value="ischemic_no_reperfusion">허혈성 비재관류</option>
                                    <option value="hemorrhagic">출혈성</option>
                                </select>
                            </div>
                            <div>
                                <label>NIHSS 점수 (0-42):</label>
                                <input type="number" value={nihssScore} onChange={(e) => setNihssScore(e.target.value)} required min="0" max="42" style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label>재관류 치료 여부:</label>
                                <input type="checkbox" checked={reperfusionTreatment} onChange={(e) => setReperfusionTreatment(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                            </div>
                            <div>
                                <label>재관류 시간 (시간):</label>
                                <input type="number" step="0.1" value={reperfusionTime} onChange={(e) => setReperfusionTime(e.target.value)} style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>뇌졸중 발생일 (YYYY-MM-DD):</label>
                                <input type="date" value={strokeDate} onChange={(e) => setStrokeDate(e.target.value)} required style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label>뇌졸중 후 경과 시간 (시간):</label>
                                <input type="number" step="0.1" value={hoursAfterStroke} onChange={(e) => setHoursAfterStroke(e.target.value)} style={{ width: '90%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>
                        </>
                    )}

                    {activeForm === 'complications' && (
                        <>
                            {/* 기존 합병증 */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <h4>기존 합병증 (해당하는 항목을 체크하세요)</h4>
                                {Object.keys(complications).map(key => (
                                    <div key={key} style={{ marginBottom: '5px' }}>
                                        <input
                                            type="checkbox"
                                            id={key}
                                            name={key}
                                            checked={complications[key]}
                                            onChange={handleComplicationChange}
                                            style={{ marginRight: '5px', transform: 'scale(1.1)' }}
                                        />
                                        <label htmlFor={key}>{
                                            key === 'sepsis' ? '패혈증' :
                                                key === 'respiratory_failure' ? '호흡부전' :
                                                    key === 'deep_vein_thrombosis' ? '심부정맥혈전증' :
                                                        key === 'pulmonary_embolism' ? '폐색전증' :
                                                            key === 'urinary_tract_infection' ? '요로감염' :
                                                                key === 'gastrointestinal_bleeding' ? '위장관 출혈' : key
                                        }</label>
                                    </div>
                                ))}
                            </div>

                            {/* 현재 투약 정보 */}
                            <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                                <h4>현재 투약 정보 (해당하는 항목을 체크하세요)</h4>
                                {Object.keys(medications).map(key => (
                                    <div key={key} style={{ marginBottom: '5px' }}>
                                        <input
                                            type="checkbox"
                                            id={key}
                                            name={key}
                                            checked={medications[key]}
                                            onChange={handleMedicationChange}
                                            style={{ marginRight: '5px', transform: 'scale(1.1)' }}
                                        />
                                        <label htmlFor={key}>{
                                            key === 'anticoagulant_flag' ? '항응고제' :
                                                key === 'antiplatelet_flag' ? '항혈소판제' :
                                                    key === 'thrombolytic_flag' ? '혈전용해제' :
                                                        key === 'antihypertensive_flag' ? '항고혈압제' :
                                                            key === 'statin_flag' ? '스타틴' :
                                                                key === 'antibiotic_flag' ? '항생제' :
                                                                    key === 'vasopressor_flag' ? '승압제' : key
                                        }</label>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeForm === 'lis' && (
                        <>
                            {/* 검사 항목명 선택/입력 */}
                            <div style={{ gridColumn: 'span 2' }}>
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
                                        <option value="DIRECT_INPUT">직접 입력...</option>
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
                                        setTestName('');
                                        setUnit('');
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
                        </>
                    )}

                    {/* 공통 날짜/시간 및 비고 필드 */}
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

                    <div style={{ gridColumn: 'span 2' }}>
                        <label>비고:</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" style={{ width: '95%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}></textarea>
                    </div>

                    <button type="submit" disabled={loading} style={{ gridColumn: 'span 2', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {loading ? '등록 중...' : '데이터 등록'}
                    </button>
                </form>
                {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
                {successMessage && <p style={{ color: 'green', marginTop: '10px' }}>{successMessage}</p>}
            </div>

            {/* LIS 수치 그래프 (기존과 동일하게 유지) */}
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
            <PatientDicomManager patient={selectedPatient} />
        </div>
    );
};
export const PatientDicomManager = ({ patient }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [studies, setStudies] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // patient 객체가 없을 경우를 대비한 방어 코드 추가
    const patientPacsId = patient?.pacs_id;
    const patientDisplayName = patient?.display || '선택된 환자';

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('업로드할 파일을 선택하세요.');
            return;
        }
        try {
            await uploadDicomFile(selectedFile);
            alert('파일이 성공적으로 업로드되었습니다.');
            setSelectedFile(null);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('파일 업로드에 실패했습니다.');
        }
    };

    const handleViewImages = async () => {
        if (!patientPacsId) {
            alert('PACS ID가 없는 환자입니다. 동기화가 필요합니다.');
            return;
        }
        try {
            const response = await fetchPatientStudies(patientPacsId);
            setStudies(response.data);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Failed to fetch studies:', error);
            alert('이미지 목록을 불러오는 데 실패했습니다.');
        }
    };

    return (
        <div style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px', backgroundColor: 'white' }}>
            <h4>PACS 이미지 관리</h4>
            
            <div>
                <input type="file" onChange={handleFileChange} />
                <button onClick={handleUpload} disabled={!selectedFile}>
                    업로드
                </button>
            </div>

            <hr style={{ margin: '20px 0' }} />

            <div>
                <button onClick={handleViewImages}>
                    {patientDisplayName}님의 영상의학 이미지 보기
                </button>
            </div>

            {/* ★ 수정: 주석을 해제하여 모달이 실제로 나타나도록 합니다. */}
            {isModalOpen && <StudiesModal studies={studies} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

// ★ 수정: 파일의 대표 컴포넌트인 LabResultsView를 default로 내보냅니다.
export default LabResultsView;