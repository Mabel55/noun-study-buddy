from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Notice we added 'my_purchased_courses'  the imports below:
from .views import (
    CourseViewSet, 
    QuestionViewSet, 
    SummaryViewSet, 
    MockExamViewSet, 
    VerifyPaymentView, 
    my_purchased_courses  # <--- Make sure this is here!
)

router = DefaultRouter()
router.register(r'courses', CourseViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'summaries', SummaryViewSet)
router.register(r'mock-exams', MockExamViewSet)

urlpatterns = [
    # This includes all the standard routes (courses, questions, etc.)
    path('', include(router.urls)),
    
    # This is the door for PAYSTACK to verify payments
    path('pay/verify/', VerifyPaymentView.as_view(), name='verify_payment'),
    
    # This is the door for the APP to check "What courses do I own?"
    path('my-courses/', my_purchased_courses, name='my_purchased_courses'),
    # This lets Django serve PDF/Media files while we are in development mode!
]