from django.urls import path, include
from rest_framework.routers import DefaultRouter

# 1. IMPORT ALL YOUR VIEWSETS (Added FillInTheGapViewSet and PopQuestionViewSet)
from .views import (
    CourseViewSet, 
    QuestionViewSet, 
    FillInTheGapViewSet,  # 👈 Added here
    PopQuestionViewSet,   # 👈 Added here
    SummaryViewSet, 
    MockExamViewSet, 
    VerifyPaymentView, 
    my_purchased_courses,
    get_summary_by_course
)

from .dashboard_views import (
    submit_exam_attempt,
    get_dashboard,
    get_weak_areas,
    get_leaderboard,
)

from .ai_views import chat_with_tutor

router = DefaultRouter()
router.register(r'courses', CourseViewSet)
router.register(r'questions', QuestionViewSet, basename='questions')
router.register(r'fill-in-gaps', FillInTheGapViewSet, basename='fill-in-gaps')  # 👈 Registered here
router.register(r'pop-questions', PopQuestionViewSet, basename='pop-questions')  # 👈 Registered here
router.register(r'summaries', SummaryViewSet)
router.register(r'mock-exams', MockExamViewSet)

urlpatterns = [
    # This includes all the standard routes (courses, questions, fill-in-gaps, pop-questions, etc.)
    path('', include(router.urls)),
    
    # This is the door for PAYSTACK to verify payments
    path('pay/verify/', VerifyPaymentView.as_view(), name='verify_payment'),
    
    # This is the door for the APP to check "What courses do I own?"
    path('my-courses/', my_purchased_courses, name='my_purchased_courses'),
    
    # This is the door for the APP to check "What summaries do I have for this course?"
    path('summaries/course/<int:course_id>/', get_summary_by_course, name='get_summary_by_course'),

    # Phase 2: Dashboard & Progress Tracking
    path('attempts/', submit_exam_attempt, name='submit_attempt'),
    path('dashboard/', get_dashboard, name='dashboard'),
    path('weak-areas/', get_weak_areas, name='weak_areas'),
    path('leaderboard/', get_leaderboard, name='leaderboard'),

    # Phase 4: AI Features
    path('chat/', chat_with_tutor, name='chat_with_tutor'),
]