from django.contrib import admin
from .models import Course, Question, Summary, MockExam, Purchase

# 1. Course Admin
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'price')

# 2. Question Admin
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('course', 'text', 'correct_answer')
    list_filter = ('course',)

# 3. Summary Admin
class SummaryAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'is_premium')

# 4. Mock Exam Admin
class MockExamAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'duration_minutes')

# 5. Purchase Admin (The one that was crashing)
class PurchaseAdmin(admin.ModelAdmin):
    # We changed 'date_bought' to 'date_purchased' here:
    list_display = ('user', 'course', 'date_purchased') 
    list_filter = ('course', 'date_purchased')

# Register your models
admin.site.register(Course, CourseAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(Summary, SummaryAdmin)
admin.site.register(MockExam, MockExamAdmin)
admin.site.register(Purchase, PurchaseAdmin)