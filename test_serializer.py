import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import traceback
from courses.models import Course
from courses.serializers import CourseListSerializer

try:
    data = CourseListSerializer(Course.objects.all(), many=True).data
    print("Success")
except Exception as e:
    print("Error:")
    print(traceback.format_exc())
