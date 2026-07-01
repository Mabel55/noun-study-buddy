"""
Dashboard & Progress Tracking API Views
Handles exam attempts, study streaks, leaderboard, and weak area detection.
"""
from datetime import date, timedelta
from django.db.models import Avg, Count, Sum, F
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import (
    Course, Question, PopQuestion, FillInTheGap,
    ExamAttempt, StudyStreak, QuestionAttempt, 
    UserProfile, Badge, UserBadge
)


def get_or_create_profile(user):
    """Helper: ensures a UserProfile exists for this user."""
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def update_streak(user):
    """Helper: updates the user's study streak based on today's date."""
    streak, _ = StudyStreak.objects.get_or_create(user=user)
    today = date.today()

    if streak.last_study_date == today:
        return streak  # Already studied today

    if streak.last_study_date == today - timedelta(days=1):
        streak.current_streak += 1  # Consecutive day!
    else:
        streak.current_streak = 1  # Streak broken, restart

    streak.last_study_date = today
    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak
    streak.save()
    return streak


def award_xp(user, points, reason=""):
    """Helper: awards XP to a user and levels them up."""
    profile = get_or_create_profile(user)
    profile.xp_points += points
    # Level up every 500 XP
    profile.level = 1 + (profile.xp_points // 500)
    profile.save()
    return profile


def check_badges(user):
    """Helper: checks and awards any new badges the user has earned."""
    profile = get_or_create_profile(user)
    earned_names = set(UserBadge.objects.filter(user=user).values_list('badge__name', flat=True))

    badge_checks = [
        ("First Exam", "🎯", "Completed your first mock exam", 
         lambda: ExamAttempt.objects.filter(user=user).exists()),
        ("Perfect Score", "🥇", "Scored 100% on a mock exam",
         lambda: ExamAttempt.objects.filter(user=user, percentage=100).exists()),
        ("5-Day Streak", "🔥", "Studied for 5 consecutive days",
         lambda: getattr(StudyStreak.objects.filter(user=user).first(), 'longest_streak', 0) >= 5),
        ("10 Exams", "📝", "Completed 10 mock exams",
         lambda: ExamAttempt.objects.filter(user=user).count() >= 10),
        ("Night Owl", "🦉", "Studied after midnight",
         lambda: ExamAttempt.objects.filter(user=user, created_at__hour__gte=0, created_at__hour__lt=5).exists()),
        ("Level 5", "⭐", "Reached Level 5",
         lambda: profile.level >= 5),
        ("High Scorer", "🏅", "Scored above 80% three times",
         lambda: ExamAttempt.objects.filter(user=user, percentage__gte=80).count() >= 3),
    ]

    for name, icon, desc, condition in badge_checks:
        if name not in earned_names and condition():
            badge, _ = Badge.objects.get_or_create(name=name, defaults={'icon': icon, 'description': desc})
            UserBadge.objects.get_or_create(user=user, badge=badge)


# ==============================================================================
# API ENDPOINTS
# ==============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_exam_attempt(request):
    """
    Called after a student finishes a mock exam.
    Saves the score, awards XP, updates streak, and checks badges.
    """
    course_id = request.data.get('course_id')
    score = request.data.get('score', 0)
    total = request.data.get('total_questions', 0)
    time_taken = request.data.get('time_taken_seconds')
    question_results = request.data.get('question_results', [])

    if not course_id or total == 0:
        return Response({'error': 'Missing course_id or total_questions'}, status=400)

    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response({'error': 'Course not found'}, status=404)

    pct = round((score / total) * 100, 1) if total > 0 else 0

    # 1. Save exam attempt
    attempt = ExamAttempt.objects.create(
        user=request.user,
        course=course,
        score=score,
        total_questions=total,
        percentage=pct,
        time_taken_seconds=time_taken,
    )

    # 2. Save individual question results (for weak area tracking)
    for qr in question_results:
        QuestionAttempt.objects.create(
            user=request.user,
            course=course,
            question_id=qr.get('question_id', 0),
            question_type=qr.get('question_type', 'CBT'),
            is_correct=qr.get('is_correct', False),
        )

    # 3. Award XP
    xp = score * 10  # 10 XP per correct answer
    if pct == 100:
        xp += 50  # Bonus for perfect score
    if pct >= 80:
        xp += 25  # Bonus for high score
    award_xp(request.user, xp)

    # 4. Update streak
    streak = update_streak(request.user)

    # 5. Check for new badges
    check_badges(request.user)

    profile = get_or_create_profile(request.user)

    return Response({
        'status': 'saved',
        'percentage': pct,
        'xp_earned': xp,
        'total_xp': profile.xp_points,
        'level': profile.level,
        'streak': streak.current_streak,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard(request):
    """
    Returns the student's complete dashboard data:
    stats, per-course progress, streak, badges, and recent exams.
    """
    user = request.user
    profile = get_or_create_profile(user)
    streak, _ = StudyStreak.objects.get_or_create(user=user)

    # Overall stats
    attempts = ExamAttempt.objects.filter(user=user)
    total_exams = attempts.count()
    avg_score = attempts.aggregate(avg=Avg('percentage'))['avg'] or 0

    # Per-course readiness
    courses = Course.objects.all()
    course_progress = []
    for c in courses:
        c_attempts = attempts.filter(course=c)
        if c_attempts.exists():
            best = c_attempts.order_by('-percentage').first()
            avg = c_attempts.aggregate(avg=Avg('percentage'))['avg'] or 0
            course_progress.append({
                'course_id': c.id,
                'code': c.code,
                'title': c.title,
                'attempts': c_attempts.count(),
                'best_score': best.percentage if best else 0,
                'avg_score': round(avg, 1),
                'readiness': min(100, round(avg * 1.1, 1)),  # Slight boost for readiness feel
            })

    # Recent exams (last 10)
    recent = attempts.order_by('-created_at')[:10]
    recent_data = [{
        'course_code': a.course.code,
        'score': a.score,
        'total': a.total_questions,
        'percentage': a.percentage,
        'date': a.created_at.strftime('%b %d, %Y'),
    } for a in recent]

    # Badges
    user_badges = UserBadge.objects.filter(user=user).select_related('badge')
    badges = [{'name': ub.badge.name, 'icon': ub.badge.icon, 'description': ub.badge.description} for ub in user_badges]

    return Response({
        'username': user.first_name or user.username,
        'xp_points': profile.xp_points,
        'level': profile.level,
        'total_exams': total_exams,
        'avg_score': round(avg_score, 1),
        'streak': {
            'current': streak.current_streak,
            'longest': streak.longest_streak,
        },
        'course_progress': course_progress,
        'recent_exams': recent_data,
        'badges': badges,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_weak_areas(request):
    """
    Returns the questions the student keeps getting wrong.
    Groups by course and returns the most-failed question IDs along with their text.
    """
    user = request.user
    course_id = request.query_params.get('course_id')

    qs = QuestionAttempt.objects.filter(user=user, is_correct=False)
    if course_id:
        qs = qs.filter(course_id=course_id)

    # Find questions failed more than once
    weak_counts = qs.values('question_id', 'question_type', 'course__code').annotate(
        fail_count=Count('id')
    ).filter(fail_count__gte=1).order_by('-fail_count')[:20]

    weak_areas = []
    for w in weak_counts:
        q_id = w['question_id']
        q_type = w['question_type']
        q_text = "Unknown question"
        
        try:
            if q_type == 'CBT':
                q_text = Question.objects.get(id=q_id).text
            elif q_type == 'FILL':
                q_text = FillInTheGap.objects.get(id=q_id).question_text
            elif q_type == 'POP':
                q_text = PopQuestion.objects.get(id=q_id).question_text
        except:
            pass
            
        weak_areas.append({
            'question_id': q_id,
            'question_type': q_type,
            'course_code': w['course__code'],
            'fail_count': w['fail_count'],
            'question_text': q_text
        })

    return Response({'weak_areas': weak_areas})


@api_view(['GET'])
@permission_classes([AllowAny])
def get_leaderboard(request):
    """
    Returns the top 20 students ranked by XP.
    """
    period = request.query_params.get('period', 'all')  # 'all' or 'weekly'

    profiles = UserProfile.objects.select_related('user').order_by('-xp_points')[:20]

    leaderboard = []
    for i, p in enumerate(profiles, 1):
        badges_count = UserBadge.objects.filter(user=p.user).count()
        leaderboard.append({
            'rank': i,
            'username': p.user.first_name or p.user.username,
            'xp_points': p.xp_points,
            'level': p.level,
            'badges_count': badges_count,
        })

    # Find current user's rank
    my_rank = None
    if request.user.is_authenticated:
        try:
            my_profile = request.user.profile
            my_rank = UserProfile.objects.filter(xp_points__gt=my_profile.xp_points).count() + 1
        except UserProfile.DoesNotExist:
            my_rank = None

    return Response({
        'leaderboard': leaderboard,
        'my_rank': my_rank,
    })
