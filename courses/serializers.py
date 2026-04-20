from rest_framework import serializers
from .models import Course, Question, MockExam, Summary, PopQuestion, FillInTheGap

# 1. Serializer for Summaries
class SummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Summary
        fields = '__all__'

# 2. Serializers for the new Question formats
class PopQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PopQuestion
        fields = '__all__'

class FillInTheGapSerializer(serializers.ModelSerializer):
    class Meta:
        model = FillInTheGap
        fields = '__all__'

# 3. Serializer for Mock Exams
class MockExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockExam
        fields = ['id', 'title', 'duration_minutes', 'is_premium']

# 4. Serializer for Standard CBT Questions
class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']

# 5. Serializer for Courses (The Master Container)
class CourseSerializer(serializers.ModelSerializer):
    summaries = SummarySerializer(many=True, read_only=True, source='summary_set')
    mock_exams = MockExamSerializer(many=True, read_only=True, source='mockexam_set')
    
    # Adding all three question types directly to the course response
    cbt_questions = QuestionSerializer(many=True, read_only=True, source='question_set')
    pop_questions = PopQuestionSerializer(many=True, read_only=True, source='popquestion_set')
    fill_questions = FillInTheGapSerializer(many=True, read_only=True, source='fillinthegap_set')

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'code', 'description', 'textbook', 
            'summaries', 'mock_exams', 
            'cbt_questions', 'pop_questions', 'fill_questions'
        ]