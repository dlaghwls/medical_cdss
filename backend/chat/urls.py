# medical_cdss-happy/backend/medical_cdss/chat/urls.py

from django.urls import path
# ★★★ MedicalStaffListView 임포트 추가 ★★★
from .views import MessageListCreateView, MedicalStaffListView 

urlpatterns = [
    # 특정 상대방과의 메시지 목록 조회 (GET) 및 메시지 생성 (POST) 엔드포인트
    path('messages/<uuid:other_user_uuid>/', MessageListCreateView.as_view(), name='message-list-for-user'),
    path('messages/new/', MessageListCreateView.as_view(), name='message-create'),

    # ★★★ 의료진 목록 조회 API 엔드포인트 추가 ★★★
    # 이 엔드포인트는 /api/chat/staff/ 로 접근하게 됩니다.
    path('staff/', MedicalStaffListView.as_view(), name='medical-staff-list'), 
]