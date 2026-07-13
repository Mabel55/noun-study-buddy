import requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

# 1. IMPORT ALL YOUR MODELS (Added FillInTheGap and PopQuestion)
from .models import Course, Question, Summary, MockExam, Purchase, FillInTheGap, PopQuestion, NewsArticle, DiscussionThread, DiscussionReply

# 2. IMPORT ALL YOUR SERIALIZERS (Added FillInTheGapSerializer and PopQuestionSerializer)
from .serializers import (
    CourseSerializer, 
    CourseListSerializer,
    QuestionSerializer, 
    SummarySerializer, 
    MockExamSerializer,
    FillInTheGapSerializer,
    PopQuestionSerializer,
    NewsArticleSerializer,
    DiscussionThreadSerializer,
    DiscussionReplySerializer
)

# ==========================
# STANDARD API VIEWSETS
# ==========================

class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.all()
    permission_classes = [AllowAny]

    def get_queryset(self):
        from django.db.models import Count
        if self.action == 'list':
            return Course.objects.prefetch_related('summary_set', 'mockexam_set').annotate(
                cbt_questions_count=Count('question', distinct=True),
                pop_questions_count=Count('popquestion', distinct=True),
                fill_questions_count=Count('fillinthegap', distinct=True)
            )
        return Course.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer


class QuestionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [AllowAny] 

    def get_queryset(self):
        queryset = Question.objects.all()
        # ✅ Dynamic Filter: Catches either ?course= or ?course_id= from the frontend
        course_param = self.request.query_params.get('course') or self.request.query_params.get('course_id')
        if course_param:
            queryset = queryset.filter(course_id=course_param)
        return queryset


# ✅ Added Fill-In-The-Gaps viewset with dynamic filtering
class FillInTheGapViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FillInTheGapSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = FillInTheGap.objects.all()
        course_param = self.request.query_params.get('course') or self.request.query_params.get('course_id')
        if course_param:
            queryset = queryset.filter(course_id=course_param)
        return queryset


# ✅ Added PopQuestion (Theory) viewset with dynamic filtering
class PopQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PopQuestionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = PopQuestion.objects.all()
        course_param = self.request.query_params.get('course') or self.request.query_params.get('course_id')
        if course_param:
            queryset = queryset.filter(course_id=course_param)
        return queryset


class SummaryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Summary.objects.all()
    serializer_class = SummarySerializer
    permission_classes = [AllowAny]


class MockExamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MockExam.objects.all()
    serializer_class = MockExamSerializer
    permission_classes = [AllowAny]

class NewsArticleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NewsArticle.objects.all()
    serializer_class = NewsArticleSerializer
    permission_classes = [AllowAny]

class DiscussionThreadViewSet(viewsets.ModelViewSet):
    serializer_class = DiscussionThreadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = DiscussionThread.objects.all()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class DiscussionReplyViewSet(viewsets.ModelViewSet):
    serializer_class = DiscussionReplySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = DiscussionReply.objects.all()
        thread_id = self.request.query_params.get('thread_id')
        if thread_id:
            queryset = queryset.filter(thread_id=thread_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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