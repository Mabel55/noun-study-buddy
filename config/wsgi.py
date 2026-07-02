"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

# --- AUTO-CREATE ADMIN USER ON BOOT (For Render Free Tier) ---
try:
    from django.contrib.auth.models import User
    username = 'admin_mabel'
    password = 'nounpassword123'
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username, 'admin@example.com', password)
    else:
        u = User.objects.get(username=username)
        u.set_password(password)
        u.save()
except Exception:
    pass
# --------------------------------------------------------------
