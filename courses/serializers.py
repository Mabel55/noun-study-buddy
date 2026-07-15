from rest_framework import serializers
from .models import Course, Question, MockExam, Summary, PopQuestion, FillInTheGap, NewsArticle, DiscussionThread, DiscussionReply, PastQuestionPaper, SemesterSettings, StudyBuddyMatch, DirectMessage

class NewsArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsArticle
        fields = '__all__'

class DiscussionReplySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = DiscussionReply
        fields = '__all__'

class DiscussionThreadSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    replies_count = serializers.IntegerField(source='replies.count', read_only=True)
    
    class Meta:
        model = DiscussionThread
        fields = '__all__'

# 1. Serializer for Summaries
class SummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Summary
        fields = '__all__'

class SummaryLightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Summary
        fields = ['id', 'title', 'is_premium', 'course']

class PastQuestionPaperSerializer(serializers.ModelSerializer):
    class Meta:
        model = PastQuestionPaper
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
        fields = '__all__'

# 5. Serializer for Courses (Detail View - with all questions)
class CourseSerializer(serializers.ModelSerializer):
    summaries = SummaryLightSerializer(many=True, read_only=True, source='summary_set')
    mock_exams = MockExamSerializer(many=True, read_only=True, source='mockexam_set')
    past_question_papers = PastQuestionPaperSerializer(many=True, read_only=True, source='pastquestionpaper_set')
    
    # Adding all three question types directly to the course response
    cbt_questions = QuestionSerializer(many=True, read_only=True, source='question_set')
    pop_questions = PopQuestionSerializer(many=True, read_only=True, source='popquestion_set')
    fill_questions = FillInTheGapSerializer(many=True, read_only=True, source='fillinthegap_set')

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'code', 'description', 'textbook', 'exam_type', 
            'summaries', 'mock_exams', 'past_question_papers',
            'cbt_questions', 'pop_questions', 'fill_questions'
        ]

# 6. Serializer for Courses (List View - Lightweight, no questions)
class CourseListSerializer(serializers.ModelSerializer):
    summaries = SummaryLightSerializer(many=True, read_only=True, source='summary_set')
    mock_exams = MockExamSerializer(many=True, read_only=True, source='mockexam_set')
    past_question_papers = PastQuestionPaperSerializer(many=True, read_only=True, source='pastquestionpaper_set')

    # These fields are populated by SerializerMethodField
    cbt_questions_count = serializers.SerializerMethodField()
    pop_questions_count = serializers.SerializerMethodField()
    fill_questions_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'code', 'description', 'textbook', 'exam_type',
            'summaries', 'mock_exams', 'past_question_papers',
            'cbt_questions_count', 'pop_questions_count', 'fill_questions_count'
        ]

    def get_cbt_questions_count(self, obj):
        return obj.question_set.count()

    def get_pop_questions_count(self, obj):
        return obj.popquestion_set.count()

    def get_fill_questions_count(self, obj):
        return obj.fillinthegap_set.count()

# 7. Next-Level Features Serializers
class SemesterSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SemesterSettings
        fields = '__all__'

class DirectMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    
    class Meta:
        model = DirectMessage
        fields = '__all__'

class StudyBuddyMatchSerializer(serializers.ModelSerializer):
    user1_username = serializers.CharField(source='user1.username', read_only=True)
    user2_username = serializers.CharField(source='user2.username', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    
    class Meta:
        model = StudyBuddyMatch
        fields = '__all__'