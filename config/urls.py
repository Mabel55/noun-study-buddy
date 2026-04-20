from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken import views  # <--- This is the key import!
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('courses.urls')),
    path('api-token-auth/', views.obtain_auth_token), # <--- The mobile login door
]

# This lets Django serve PDF/Media files while we are in development mode!
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)