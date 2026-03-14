from django.db import models
from django.contrib.auth.models import User

# 1. The Course Table (Holds Title, Code, Price, Textbook)
class Course(models.Model):
    title = models.CharField(max_length=200)
    code = models.CharField(max_length=20)  # e.g., MTH101
    description = models.TextField()
    # The textbook file (PDF)
    textbook = models.FileField(upload_to='textbooks/', blank=True, null=True)
    # The price in Naira (0 = Free)
    price = models.IntegerField(default=0)

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

# 3. The Summary Table (For PDF Lecture Notes/Summaries)
class Summary(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='summaries/')
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