import threading
from django.contrib import admin, messages
from .models import Course, Question, Summary, MockExam, Purchase, PopQuestion, FillInTheGap, NewsArticle, DiscussionThread, DiscussionReply
from .rag_tasks import process_course_rag_background

@admin.action(description='Generate AI Content (Summary & Questions) from Textbook')
def generate_ai_content(modeladmin, request, queryset):
    for course in queryset:
        if course.textbook:
            threading.Thread(target=process_course_rag_background, args=(course.id,)).start()
            modeladmin.message_user(request, f"Started AI RAG pipeline for {course.code}. This will take a few minutes in the background.", level=messages.SUCCESS)
        else:
            modeladmin.message_user(request, f"Skipped {course.code} - no textbook uploaded.", level=messages.ERROR)

# 1. Course Admin
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'price')
    actions = [generate_ai_content]

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

class NewsArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'date_posted', 'is_important')
    list_filter = ('category', 'is_important')

# Register your models
admin.site.register(Course, CourseAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(Summary, SummaryAdmin)
admin.site.register(MockExam, MockExamAdmin)
admin.site.register(Purchase, PurchaseAdmin)
admin.site.register(FillInTheGap)
admin.site.register(PopQuestion)
admin.site.register(NewsArticle, NewsArticleAdmin)
admin.site.register(DiscussionThread)
admin.site.register(DiscussionReply)