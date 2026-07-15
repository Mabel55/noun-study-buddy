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

# 1.5 The Past Question Paper Table (For OCR and Downloads)
class PastQuestionPaper(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    year = models.CharField(max_length=20) # e.g. "2023"
    semester = models.CharField(max_length=50) # e.g. "First Semester"
    file = models.FileField(upload_to='past_questions/', blank=True, null=True)

    def __str__(self):
        return f"{self.course.code} - {self.year} ({self.semester})"

# 2. The Question Table (For CBT Practice)
class Question(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    past_question_paper = models.ForeignKey(PastQuestionPaper, on_delete=models.SET_NULL, null=True, blank=True)
    year = models.CharField(max_length=20, null=True, blank=True)
    semester = models.CharField(max_length=50, null=True, blank=True)
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
    past_question_paper = models.ForeignKey(PastQuestionPaper, on_delete=models.SET_NULL, null=True, blank=True)
    year = models.CharField(max_length=20, null=True, blank=True)
    semester = models.CharField(max_length=50, null=True, blank=True)
    question_text = models.TextField()
    answer_text = models.TextField() # Holds the detailed explanation/steps

    def __str__(self):
        return f"{self.course.code} - POP Q&A"
    
# The Fill-in-the-Gap Table (For NOUN CBT Standard)
class FillInTheGap(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    past_question_paper = models.ForeignKey(PastQuestionPaper, on_delete=models.SET_NULL, null=True, blank=True)
    year = models.CharField(max_length=20, null=True, blank=True)
    semester = models.CharField(max_length=50, null=True, blank=True)
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
    expo_push_token = models.CharField(max_length=255, null=True, blank=True)

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


# ==============================================================================
# PHASE 5: PLANNING & EXAM SCHEDULE
# ==============================================================================

class ExamSchedule(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    exam_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.course.code} on {self.exam_date}"


# ==============================================================================
# PHASE 6: NOUN NEWS & ACTIVITIES
# ==============================================================================

class NewsArticle(models.Model):
    CATEGORY_CHOICES = [
        ('TMA', 'TMA Updates'),
        ('EXAM', 'Exam Timetable'),
        ('GENERAL', 'General NOUN News'),
        ('EVENTS', 'Campus Activities'),
    ]
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    content = models.TextField()
    date_posted = models.DateTimeField(auto_now_add=True)
    is_important = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date_posted']

    def __str__(self):
        return f"[{self.category}] {self.title}"


# ==============================================================================
# PHASE 7: COURSE COMMUNITIES (FORUMS)
# ==============================================================================

class DiscussionThread(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='threads')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class DiscussionReply(models.Model):
    thread = models.ForeignKey(DiscussionThread, on_delete=models.CASCADE, related_name='replies')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Reply by {self.user.username} on {self.thread.title}"

# ==============================================================================
# PHASE 8: NEXT-LEVEL FEATURES (Push, TMA Countdown, P2P Chat)
# ==============================================================================

class SemesterSettings(models.Model):
    current_semester = models.CharField(max_length=50, default="2026_1")
    tma_1_deadline = models.DateField(null=True, blank=True)
    tma_2_deadline = models.DateField(null=True, blank=True)
    tma_3_deadline = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Settings for {self.current_semester}"


class StudyBuddyMatch(models.Model):
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_user2')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    matched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user1', 'user2', 'course')

    def __str__(self):
        return f"{self.user1.username} & {self.user2.username} ({self.course.code})"


class DirectMessage(models.Model):
    match = models.ForeignKey(StudyBuddyMatch, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['sent_at']

    def __str__(self):
        return f"Message from {self.sender.username} at {self.sent_at}"
