from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken import views  # <--- This is the key import!
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

def create_admin_view(request):
    try:
        from django.contrib.auth.models import User
        username = 'admin_mabel'
        password = 'nounpassword123'
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username, 'admin@example.com', password)
            return HttpResponse(f"SUCCESS: Created new superuser {username}")
        else:
            u = User.objects.get(username=username)
            u.set_password(password)
            u.save()
            return HttpResponse(f"SUCCESS: Updated password for {username}")
    except Exception as e:
        import traceback
        return HttpResponse(f"ERROR: {str(e)}<br><pre>{traceback.format_exc()}</pre>")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('courses.urls')),
    path('api-token-auth/', views.obtain_auth_token), # <--- The mobile login door
    path('api/auth/', include('dj_rest_auth.urls')),  # login, logout, user
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),  # signup
    path('create-admin/', create_admin_view),
]

# This lets Django serve PDF/Media files while we are in development mode!
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)