from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Q
from .models import Course, SemesterSettings, StudyBuddyMatch, DirectMessage, UserProfile
from .serializers import SemesterSettingsSerializer, StudyBuddyMatchSerializer, DirectMessageSerializer
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_push_token(request):
    token = request.data.get('expo_push_token')
    if token:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.expo_push_token = token
        profile.save()
        return Response({'status': 'success'})
    return Response({'error': 'Token required'}, status=400)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_semester_settings(request):
    settings = SemesterSettings.objects.first()
    if settings:
        serializer = SemesterSettingsSerializer(settings)
        return Response(serializer.data)
    return Response({'error': 'No settings found'}, status=404)

class StudyBuddyMatchViewSet(viewsets.ModelViewSet):
    serializer_class = StudyBuddyMatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudyBuddyMatch.objects.filter(Q(user1=self.request.user) | Q(user2=self.request.user))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_match(request):
    course_id = request.data.get('course_id')
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response({'error': 'Course not found'}, status=404)

    # Simple matching logic: find any match where this user is user1 or user2 for this course
    existing_match = StudyBuddyMatch.objects.filter(course=course).filter(Q(user1=request.user) | Q(user2=request.user)).first()
    if existing_match:
        return Response(StudyBuddyMatchSerializer(existing_match).data)

    # Find another user
    from .models import ExamAttempt
    other_users = User.objects.filter(examattempt__course=course).exclude(id=request.user.id).distinct()
    if not other_users.exists():
        # Fallback: any other user (for testing)
        other_users = User.objects.exclude(id=request.user.id)
    
    if other_users.exists():
        match = StudyBuddyMatch.objects.create(user1=request.user, user2=other_users.first(), course=course)
        return Response(StudyBuddyMatchSerializer(match).data)
    
    return Response({'error': 'No matching buddies found yet'}, status=404)

class DirectMessageViewSet(viewsets.ModelViewSet):
    serializer_class = DirectMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        match_id = self.request.query_params.get('match_id')
        if match_id:
            return DirectMessage.objects.filter(match_id=match_id).filter(Q(match__user1=self.request.user) | Q(match__user2=self.request.user)).order_by('sent_at')
        return DirectMessage.objects.none()

    def perform_create(self, serializer):
        match_id = self.request.data.get('match')
        match = StudyBuddyMatch.objects.get(id=match_id)
        if self.request.user not in [match.user1, match.user2]:
            raise PermissionDenied("You are not part of this match")
        serializer.save(sender=self.request.user)
