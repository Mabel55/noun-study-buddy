"""
Exam Planner API Views
"""
from datetime import date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import F
from .models import Course, ExamSchedule

@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def exam_planner(request):
    user = request.user

    if request.method == 'GET':
        schedules = ExamSchedule.objects.filter(user=user).order_by('exam_date')
        
        # Format the response with days remaining
        today = date.today()
        data = []
        for s in schedules:
            days_left = (s.exam_date - today).days
            data.append({
                'id': s.id,
                'course_id': s.course.id,
                'course_code': s.course.code,
                'course_title': s.course.title,
                'exam_date': s.exam_date.strftime('%Y-%m-%d'),
                'days_left': max(0, days_left),
                'is_past': days_left < 0
            })
            
        return Response({'schedules': data})

    elif request.method == 'POST':
        course_id = request.data.get('course_id')
        exam_date = request.data.get('exam_date')
        
        if not course_id or not exam_date:
            return Response({'error': 'Missing course_id or exam_date'}, status=400)
            
        try:
            course = Course.objects.get(id=course_id)
            # Update if exists, otherwise create
            schedule, created = ExamSchedule.objects.update_or_create(
                user=user,
                course=course,
                defaults={'exam_date': exam_date}
            )
            return Response({'status': 'success', 'id': schedule.id})
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=404)

    elif request.method == 'DELETE':
        schedule_id = request.data.get('id')
        if not schedule_id:
            return Response({'error': 'Missing schedule id'}, status=400)
            
        ExamSchedule.objects.filter(id=schedule_id, user=user).delete()
        return Response({'status': 'deleted'})
