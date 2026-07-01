from django.db import models
from django.contrib.auth.models import User

# 1. The Course Table (Holds Title, Code, Price, Textbook)
class Course(models.Model):
    EXAM_TYPE_CHOICES = [
        ('CBT', 'Computer-Based Test (100-200 Level)'),
        ('POP', 'Pen-On-Paper (300+ Level)'),
    ]

    title = models.CharField(max_length=200)
    code = models.CharField(max_length=20)  # e.g., MTH101
    description = models.TextField(null=True, blank=True)
    # The textbook file (PDF)
    textbook = models.FileField(upload_to='textbooks/', blank=True, null=True)
    # The price in Naira (0 = Free)
    price = models.IntegerField(default=0)
    # CBT for 100-200 level, POP for 300+ level
    exam_type = models.CharField(max_length=3, choices=EXAM_TYPE_CHOICES, default='CBT')

    def __str__(self):
        return f"{self.code} - {self.title}"

# 2. The Question Table (For CBT Practice)
class Question(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    text = models.TextField()
    option_a = models.CharField(max_length=200)
    option_b = models.CharField(max_length=200)
    option_c = models.CharField(max_length=200)
    option_d = models.CharField(max_length=200)
    
    ANSWER_CHOICES = [
        ('A', 'Option A'),
        ('B', 'Option B'),
        ('C', 'Option C'),
        ('D', 'Option D'),
    ]
    correct_answer = models.CharField(max_length=1, choices=ANSWER_CHOICES)

    def __str__(self):
        return f"{self.course.code}: {self.text[:50]}..."
    
# The Q&A Table (For POP / Short Answer Practice)
class PopQuestion(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    question_text = models.TextField()
    answer_text = models.TextField() # Holds the detailed explanation/steps

    def __str__(self):
        return f"{self.course.code} - POP Q&A"
    
# The Fill-in-the-Gap Table (For NOUN CBT Standard)
class FillInTheGap(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    question_text = models.TextField() # e.g., "The capital of Nigeria is ______."
    correct_answer = models.CharField(max_length=255) 

    def __str__(self):
        return f"{self.course.code} - Fill in the Gap"

# 3. The Summary Table (For PDF Lecture Notes/Summaries)
class Summary(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to='summaries/', blank=True, null=True)
    is_premium = models.BooleanField(default=False)

    def __str__(self):
        return self.title

# 4. The Mock Exam Table (For the Timer Feature)
class MockExam(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    duration_minutes = models.IntegerField(default=60)
    is_premium = models.BooleanField(default=False)

    def __str__(self):
        return self.title

# 5. The Purchase Table (Tracks who bought what)
# This is likely the part you accidentally deleted!
class Purchase(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    date_purchased = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} bought {self.course.code}"


# ==============================================================================
# PHASE 2: PROGRESS TRACKING & GAMIFICATION
# ==============================================================================

# 6. User Profile (Extended user data, XP, level)
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    xp_points = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    matric_number = models.CharField(max_length=30, blank=True, default='')

    def __str__(self):
        return f"{self.user.username} - Level {self.level} ({self.xp_points} XP)"


# 7. Exam Attempt (Tracks every mock exam a student takes)
class ExamAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    score = models.IntegerField()
    total_questions = models.IntegerField()
    percentage = models.FloatField()
    time_taken_seconds = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.course.code}: {self.score}/{self.total_questions}"


# 8. Study Streak (Tracks consecutive study days)
class StudyStreak(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='streak')
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_study_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.current_streak} day streak"


# 9. Question Attempt (Tracks individual question results for weak area detection)
class QuestionAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    question_id = models.IntegerField()  # ID of the question (from any type)
    question_type = models.CharField(max_length=4, choices=[('CBT','CBT'),('FILL','FILL'),('POP','POP')])
    is_correct = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - Q{self.question_id} {'✓' if self.is_correct else '✗'}"


# 10. Badge (Achievement definitions)
class Badge(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10)  # emoji like 🥇, 🔥
    description = models.TextField()

    def __str__(self):
        return f"{self.icon} {self.name}"


# 11. UserBadge (Badges earned by a student)
class UserBadge(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} earned {self.badge.name}"