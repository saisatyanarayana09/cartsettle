import os
import django
import sys
sys.path.append('s:/smart-kirana/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from store.models import StoreEmailSettings
from store.serializers import StoreEmailSettingsSerializer
if __name__ == '__main__':
    email_settings = StoreEmailSettings.load()
    data = {'sender_email': 'test@example.com', 'app_password': 'testpassword1234'}
    serializer = StoreEmailSettingsSerializer(email_settings, data=data, partial=True)
    if serializer.is_valid():
        serializer.save()
        print('Saved!')
        print(serializer.data)
    else:
        print(serializer.errors)
