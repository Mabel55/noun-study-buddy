from rest_framework import serializers
from .models import Course, Question, MockExam, Summary

# 1. Serializer for Summaries
class SummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Summary
        fields = ['id', 'title', 'file', 'is_premium']

# 2. Serializer for Mock Exams (Updated with Timer & Premium)
class MockExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockExam
        fields = ['id', 'title', 'duration_minutes', 'is_premium']

# 3. Serializer for Questions
class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']

# 4. Serializer for Courses
class CourseSerializer(serializers.ModelSerializer):
    summaries = SummarySerializer(many=True, read_only=True, source='summary_set')
    # This line adds the Mock Exams to the Course API
    mock_exams = MockExamSerializer(many=True, read_only=True, source='mockexam_set')

    class Meta:
        model = Course
        fields = ['id', 'title', 'code', 'description', 'textbook', 'summaries', 'mock_exams']