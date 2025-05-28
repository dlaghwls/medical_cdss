import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { Calendar, User, Activity, AlertCircle, CheckCircle, Clock, TrendingUp, Heart, Brain } from 'lucide-react';

const PatientSOD2Dashboard = () => {
  const [patientData, setPatientData] = useState({
    name: '김철수',
    age: 65,
    gender: '남성',
    strokeType: 'ischemic_reperfusion', // ischemic_reperfusion, ischemic_no_reperfusion, hemorrhagic
    strokeDate: '2024-01-15',
    reperfusionTreatment: true,
    reperfusionTime: 2.5, // hours after stroke onset
    nihssScore: 8,
    currentMedications: ['Aspirin', 'Atorvastatin', 'Lisinopril'],
    comorbidities: ['고혈압', '당뇨병'],
    currentSOD2Level: 0.75, // 현재 측정된 SOD2 수준 (가상)
    lastUpdated: '2024-01-18 14:30'
  });

  const [currentTime, setCurrentTime] = useState(96); // 뇌졸중 발생 후 경과 시간(시간)
  
  // 환자별 맞춤 SOD2 예측 데이터 생성
  const generatePersonalizedData = (patientInfo, currentHour) => {
    const baseData = [
      {time: 0, predicted: 1.0, confidence: 0.95},
      {time: 3, predicted: 0.75, confidence: 0.90},
      {time: 6, predicted: 0.6, confidence: 0.85},
      {time: 12, predicted: 0.7, confidence: 0.88},
      {time: 24, predicted: 0.8, confidence: 0.90},
      {time: 48, predicted: 0.9, confidence: 0.92},
      {time: 72, predicted: 0.95, confidence: 0.94},
      {time: 96, predicted: 0.98, confidence: 0.95},
      {time: 120, predicted: 1.0, confidence: 0.96},
      {time: 144, predicted: 1.0, confidence: 0.97},
      {time: 168, predicted: 1.0, confidence: 0.98}
    ];

    // 환자 특성에 따른 조정
    const adjustmentFactors = {
      age: patientInfo.age > 70 ? 0.9 : patientInfo.age < 50 ? 1.1 : 1.0,
      strokeType: patientInfo.strokeType === 'hemorrhagic' ? 0.8 : 
                  patientInfo.strokeType === 'ischemic_no_reperfusion' ? 0.9 : 1.0,
      nihss: patientInfo.nihssScore > 15 ? 0.85 : patientInfo.nihssScore < 5 ? 1.1 : 1.0,
      reperfusionTiming: patientInfo.reperfusionTime <= 3 ? 1.1 : 
                        patientInfo.reperfusionTime <= 4.5 ? 1.05 : 0.95
    };

    const totalAdjustment = Object.values(adjustmentFactors).reduce((a, b) => a * b, 1);

    return baseData.map(point => ({
      ...point,
      predicted: Math.min(1.0, point.predicted * totalAdjustment),
      actual: point.time === currentHour ? patientInfo.currentSOD2Level : null,
      riskLevel: point.predicted < 0.7 ? 'high' : point.predicted < 0.85 ? 'medium' : 'low'
    }));
  };

  const personalizedData = generatePersonalizedData(patientData, currentTime);
  const currentSOD2Prediction = personalizedData.find(d => d.time === currentTime);

  // 운동 권장사항 계산
  const getExerciseRecommendation = (sod2Level, strokeType, hoursAfterStroke) => {
    const baseRecommendations = {
      ischemic_reperfusion: { startTime: 72, safeSOD2: 0.85 },
      ischemic_no_reperfusion: { startTime: 96, safeSOD2: 0.85 },
      hemorrhagic: { startTime: 120, safeSOD2: 0.8 }
    };

    const recommendation = baseRecommendations[strokeType];
    const canStart = hoursAfterStroke >= recommendation.startTime && sod2Level >= recommendation.safeSOD2;
    
    let intensity = 0;
    if (canStart) {
      intensity = Math.min(100, ((sod2Level - recommendation.safeSOD2) / (1 - recommendation.safeSOD2)) * 100);
    }

    return {
      canStart,
      intensity: Math.round(intensity),
      timeUntilStart: Math.max(0, recommendation.startTime - hoursAfterStroke),
      sod2Target: recommendation.safeSOD2
    };
  };

  const exerciseRec = getExerciseRecommendation(patientData.currentSOD2Level, patientData.strokeType, currentTime);

  const formatTime = (hours) => {
    if (hours === 0) return '0시간';
    if (hours < 24) return `${hours}시간`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours ? `${days}일 ${remainingHours}시간` : `${days}일`;
  };

  const getStrokeTypeKorean = (type) => {
    const types = {
      'ischemic_reperfusion': '허혈성 뇌졸중 (재관류 치료)',
      'ischemic_no_reperfusion': '허혈성 뇌졸중 (보존적 치료)',
      'hemorrhagic': '출혈성 뇌졸중'
    };
    return types[type] || type;
  };

  const getRiskColor = (level) => {
    const colors = {
      'high': 'text-red-600 bg-red-100',
      'medium': 'text-yellow-600 bg-yellow-100',
      'low': 'text-green-600 bg-green-100'
    };
    return colors[level] || 'text-gray-600 bg-gray-100';
  };

  const getRiskText = (level) => {
    const texts = {
      'high': '높음',
      'medium': '보통',
      'low': '낮음'
    };
    return texts[level] || '알 수 없음';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* 환자 정보 헤더 */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{patientData.name}</h1>
              <p className="text-gray-600">{patientData.age}세, {patientData.gender}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">마지막 업데이트</p>
            <p className="font-semibold">{patientData.lastUpdated}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">뇌졸중 유형</span>
            </div>
            <p className="text-blue-700 mt-1">{getStrokeTypeKorean(patientData.strokeType)}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">발병일</span>
            </div>
            <p className="text-green-700 mt-1">{patientData.strokeDate}</p>
            <p className="text-sm text-green-600">({formatTime(currentTime)} 경과)</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-800">NIHSS 점수</span>
            </div>
            <p className="text-purple-700 mt-1">{patientData.nihssScore}점</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-orange-800">재관류 치료</span>
            </div>
            <p className="text-orange-700 mt-1">
              {patientData.reperfusionTreatment ? `${patientData.reperfusionTime}시간 후 시행` : '시행 안함'}
            </p>
          </div>
        </div>
      </div>

      {/* SOD2 현재 상태 및 위험도 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">현재 SOD2 수준</h3>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {(patientData.currentSOD2Level * 100).toFixed(0)}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${patientData.currentSOD2Level * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">정상 대비 발현 수준</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">산화 스트레스 위험도</h3>
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="text-center">
            <div className={`inline-block px-4 py-2 rounded-full font-semibold ${getRiskColor(currentSOD2Prediction?.riskLevel)}`}>
              {getRiskText(currentSOD2Prediction?.riskLevel)}
            </div>
            <p className="text-sm text-gray-600 mt-3">
              예측 신뢰도: {((currentSOD2Prediction?.confidence || 0.9) * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">운동 시작 권장</h3>
            <Activity className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-center">
            {exerciseRec.canStart ? (
              <div>
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-700">운동 시작 가능</p>
                <p className="text-sm text-gray-600">권장 강도: {exerciseRec.intensity}%</p>
              </div>
            ) : (
              <div>
                <Clock className="w-12 h-12 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold text-orange-700">
                  {exerciseRec.timeUntilStart > 0 ? 
                    `${formatTime(exerciseRec.timeUntilStart)} 후 시작` : 
                    'SOD2 수준 회복 필요'
                  }
                </p>
                <p className="text-sm text-gray-600">
                  목표 SOD2: {(exerciseRec.sod2Target * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SOD2 예측 그래프 */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">개인 맞춤형 SOD2 발현 예측</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={personalizedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              label={{ value: '뇌졸중 발생 후 경과 시간 (시간)', position: 'insideBottom', offset: -10 }}
              tickFormatter={formatTime}
            />
            <YAxis 
              label={{ value: 'SOD2 발현 수준', angle: -90, position: 'insideLeft' }}
              domain={[0, 1.1]}
            />
            <Tooltip 
              formatter={(value, name) => [
                name === 'predicted' ? `${(value * 100).toFixed(1)}%` : 
                name === 'actual' ? `${(value * 100).toFixed(1)}% (실측)` : value,
                name === 'predicted' ? '예측 SOD2' : 
                name === 'actual' ? '실측 SOD2' : name
              ]}
              labelFormatter={(time) => `${formatTime(time)} 경과`}
            />
            <Legend />
            
            {/* 위험 구간 표시 */}
            <Area
              dataKey={(data) => data.predicted < 0.7 ? data.predicted : null}
              fill="#FEE2E2"
              stroke="none"
              fillOpacity={0.6}
              name="고위험 구간"
            />
            
            <Line 
              type="monotone" 
              dataKey="predicted" 
              name="예측 SOD2 수준"
              stroke="#2563EB" 
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            
            {/* 실측값 표시 */}
            <Line 
              type="monotone" 
              dataKey="actual" 
              name="실측 SOD2 수준"
              stroke="#DC2626" 
              strokeWidth={4}
              dot={{ r: 8, fill: '#DC2626' }}
              connectNulls={false}
            />
            
            {/* 현재 시점 표시 */}
            <ReferenceLine 
              x={currentTime} 
              stroke="#16A34A" 
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: '현재',
                position: 'top',
                fill: '#16A34A',
                fontSize: 14
              }}
            />
            
            {/* 운동 시작 권장 시점 */}
            <ReferenceLine 
              x={exerciseRec.canStart ? currentTime : 
                 (patientData.strokeType === 'ischemic_reperfusion' ? 72 :
                  patientData.strokeType === 'ischemic_no_reperfusion' ? 96 : 120)} 
              stroke="#F59E0B" 
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: '운동 시작 권장',
                position: 'bottom',
                fill: '#F59E0B',
                fontSize: 12
              }}
            />
            
            {/* 안전 SOD2 수준 */}
            <ReferenceLine 
              y={exerciseRec.sod2Target} 
              stroke="#10B981" 
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: `안전 SOD2 수준 (${(exerciseRec.sod2Target * 100).toFixed(0)}%)`,
                position: 'right',
                fill: '#10B981',
                fontSize: 12
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 개인화 요인 및 권장사항 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">개인화 조정 요인</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">연령 조정 (65세)</span>
              <span className="text-blue-600 font-semibold">표준</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">뇌졸중 중증도 (NIHSS: 8)</span>
              <span className="text-yellow-600 font-semibold">중등도</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">재관류 치료 시점</span>
              <span className="text-green-600 font-semibold">양호 (2.5시간)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">동반질환</span>
              <span className="text-orange-600 font-semibold">{patientData.comorbidities.join(', ')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">맞춤형 운동 권장사항</h3>
          <div className="space-y-3">
            {exerciseRec.canStart ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="font-semibold text-green-800">✓ 운동 시작 가능</p>
                  <p className="text-green-700 text-sm mt-1">현재 SOD2 수준이 안전 기준을 충족합니다.</p>
                </div>
                <div className="space-y-2">
                  <p><strong>권장 운동 강도:</strong> {exerciseRec.intensity}%</p>
                  <p><strong>시작 운동:</strong> 가벼운 관절 운동, 침상 운동</p>
                  <p><strong>진행 계획:</strong> SOD2 수준에 따라 단계적 강도 증가</p>
                  <p><strong>모니터링:</strong> 매일 SOD2 수준 확인 권장</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="font-semibold text-orange-800">⚠ 운동 시작 대기</p>
                  <p className="text-orange-700 text-sm mt-1">
                    {exerciseRec.timeUntilStart > 0 ? 
                      `${formatTime(exerciseRec.timeUntilStart)} 후 재평가 예정` : 
                      'SOD2 수준이 목표치에 도달할 때까지 대기'
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <p><strong>현재 권장:</strong> 안정 가료 및 모니터링</p>
                  <p><strong>목표 SOD2:</strong> {(exerciseRec.sod2Target * 100).toFixed(0)}% 이상</p>
                  <p><strong>현재 SOD2:</strong> {(patientData.currentSOD2Level * 100).toFixed(0)}%</p>
                  <p><strong>다음 평가:</strong> 24시간 후</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 알림 및 주의사항 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">중요 안내사항</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• 이 예측은 개인의 의료 정보를 바탕으로 한 추정치이며, 실제 임상 상황을 완전히 반영하지 못할 수 있습니다.</li>
              <li>• 운동 시작 전 반드시 담당 의료진과 상담하시기 바랍니다.</li>
              <li>• SOD2 수준은 정기적으로 모니터링되어야 하며, 예상과 다른 변화가 있을 시 즉시 의료진에게 보고하세요.</li>
              <li>• 환자의 전반적인 상태, 활력징후, 신경학적 변화를 종합적으로 고려하여 최종 결정하시기 바랍니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientSOD2Dashboard;
