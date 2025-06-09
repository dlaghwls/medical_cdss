# medical_cdss-happy/backend/medical_cdss/chat/views.py

# ★★★ serializers 임포트 추가 ★★★
from rest_framework import generics, status, serializers 
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q 

from .models import Message
from .serializers import MessageSerializer, StaffSerializer 
from django.contrib.auth import get_user_model 

User = get_user_model() 

class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated] 

    def get_queryset(self):
        current_user = self.request.user 
        other_user_uuid = self.kwargs.get('other_user_uuid') 

        if not other_user_uuid:
            return Message.objects.none()

        try:
            other_user = User.objects.get(uuid=other_user_uuid)
        except User.DoesNotExist:
            return Message.objects.none()

        queryset = Message.objects.filter(
            Q(sender=current_user, receiver=other_user) | 
            Q(sender=other_user, receiver=current_user)
        ).order_by('timestamp') 
        
        Message.objects.filter(receiver=current_user, sender=other_user, is_read=False).update(is_read=True)

        return queryset

    def perform_create(self, serializer):
        receiver_uuid = self.request.data.get('receiver_uuid')
        if not receiver_uuid:
            # ★★★ 이제 serializers.ValidationError가 올바르게 인식될 것입니다. ★★★
            raise serializers.ValidationError({"receiver_uuid": "Receiver UUID is required."})
        
        try:
            receiver_user = User.objects.get(uuid=receiver_uuid)
        except User.DoesNotExist:
            # ★★★ 이제 serializers.ValidationError가 올바르게 인식될 것입니다. ★★★
            raise serializers.ValidationError({"receiver_uuid": "Receiver not found with the provided UUID."})

        serializer.save(sender=self.request.user, receiver=receiver_user)


class MedicalStaffListView(generics.ListAPIView):
    serializer_class = StaffSerializer 
    permission_classes = [IsAuthenticated] 

    def get_queryset(self):
        return User.objects.exclude(id=self.request.user.id).order_by('display')