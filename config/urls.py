from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken import views  # <--- This is the key import!

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('courses.urls')), 
    path('api-token-auth/', views.obtain_auth_token), # <--- The mobile login door
]