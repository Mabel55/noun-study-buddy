import requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

# 1. IMPORT ALL YOUR MODELS HERE
from .models import Course, Question, Summary, MockExam, Purchase

# 2. IMPORT ALL YOUR SERIALIZERS HERE
from .serializers import (
    CourseSerializer, 
    QuestionSerializer, 
    SummarySerializer, 
    MockExamSerializer
)

# ==========================
# STANDARD API VIEWSETS
# ==========================

class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [AllowAny] # Everyone can see the list of courses

class QuestionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    # We will refine permissions later so only paid users see this
    permission_classes = [AllowAny] 

class SummaryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Summary.objects.all()
    serializer_class = SummarySerializer
    permission_classes = [AllowAny]

class MockExamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MockExam.objects.all()
    serializer_class = MockExamSerializer
    permission_classes = [AllowAny]

# ==========================
# PAYMENT & PROFILE FEATURES
# ==========================

class VerifyPaymentView(APIView):
    def post(self, request):
        reference = request.data.get('reference')
        course_id = request.data.get('course_id')

        # 1. Verify transaction with Paystack
        headers = {'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'}
        url = f'https://api.paystack.co/transaction/verify/{reference}'
        
        try:
            response = requests.get(url, headers=headers)
            response_data = response.json()

            # 2. If Paystack says "Success":
            if response_data['status'] and response_data['data']['status'] == 'success':
                course = Course.objects.get(id=course_id)
                # Create the record in our database
                Purchase.objects.get_or_create(user=request.user, course=course)
                return Response({'status': 'access_granted'}, status=status.HTTP_200_OK)
            
            return Response({'error': 'Payment verification failed'}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_purchased_courses(request):
    # 1. Find all purchase records for this user
    purchases = Purchase.objects.filter(user=request.user)
    
    # 2. Make a simple list of the Course IDs (e.g., [1, 2])
    purchased_ids = [p.course.id for p in purchases]
    
    # 3. Send it to the app
    return Response({'purchased_course_ids': purchased_ids})

    @api_view(['GET'])
@permission_classes([AllowAny])
def get_summary_by_course(request, course_id):
    try:
        # This finds the summary linked to the specific course_id
        summary = Summary.objects.get(course_id=course_id)
        serializer = SummarySerializer(summary)
        return Response(serializer.data)
    except Summary.DoesNotExist:
        return Response({"detail": "No summary available for this course."}, status=404)