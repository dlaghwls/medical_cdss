# medical_cdss-happy/backend/medical_cdss/chat/serializers.py

from rest_framework import serializers
from .models import Message
from django.contrib.auth import get_user_model # User 모델을 가져오기 위함

User = get_user_model() # settings.AUTH_USER_MODEL에 지정된 사용자 모델을 가져옵니다.

class MessageSerializer(serializers.ModelSerializer):
    # 메시지 전송 시 프론트엔드로부터 받을 UUID 필드 (쓰기 전용)
    sender_uuid = serializers.UUIDField(write_only=True, required=True) 
    receiver_uuid = serializers.UUIDField(write_only=True, required=True) 
    
    # 읽기 전용으로 sender와 receiver의 display 이름 반환 (옵션)
    sender_display = serializers.SerializerMethodField(read_only=True) 
    receiver_display = serializers.SerializerMethodField(read_only=True) 

    class Meta:
        model = Message
        fields = ['uuid', 'sender', 'receiver', 'content', 'timestamp', 'is_read', 'sender_uuid', 'receiver_uuid', 'sender_display', 'receiver_display']
        # 'sender'와 'receiver'는 내부적으로 설정되므로 read_only 필드로 지정
        read_only_fields = ['uuid', 'timestamp', 'is_read', 'sender', 'receiver'] 

    # sender의 display 이름을 가져오는 메서드
    def get_sender_display(self, obj):
        # User 모델에 'display' 속성이 있다면 사용, 없으면 'username' 사용
        return obj.sender.display if hasattr(obj.sender, 'display') and obj.sender.display else obj.sender.username

    # receiver의 display 이름을 가져오는 메서드
    def get_receiver_display(self, obj):
        return obj.receiver.display if hasattr(obj.receiver, 'display') and obj.receiver.display else obj.receiver.username

    def create(self, validated_data):
        sender_uuid = validated_data.pop('sender_uuid')
        receiver_uuid = validated_data.pop('receiver_uuid')

        try:
            # UUID를 사용하여 사용자 객체 조회
            sender_user = User.objects.get(uuid=sender_uuid)
            receiver_user = User.objects.get(uuid=receiver_uuid)
        except User.DoesNotExist:
            raise serializers.ValidationError("Sender or receiver not found with provided UUIDs.")
        
        # Message 객체 생성 시 sender와 receiver를 실제 사용자 객체로 연결
        message = Message.objects.create(sender=sender_user, receiver=receiver_user, **validated_data)
        return message

# ★★★ StaffSerializer 클래스 추가 ★★★
# 이 시리얼라이저는 User 모델의 정보를 직렬화하여 프론트엔드로 전달하는 데 사용됩니다.
class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = User # Django의 User 모델 사용
        # 프론트엔드에 필요한 필드(uuid, username, email, first_name, last_name, display, role)를 지정
        fields = ['uuid', 'username', 'email', 'first_name', 'last_name', 'display', 'role']
        read_only_fields = ['uuid', 'username', 'email', 'first_name', 'last_name', 'display', 'role']