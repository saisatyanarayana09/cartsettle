import sys
sys.path.insert(0, r's:\smart-kirana\backend')
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User, DeliveryPartnerProfile

username = 'rider1'
password = 'Rider@123'

user, created = User.objects.get_or_create(username=username)
user.set_password(password)
user.first_name = 'Ramesh'
user.last_name = 'Kumar'
user.is_delivery_partner = True
user.is_customer = False
user.is_active = True
user.save()

profile, _ = DeliveryPartnerProfile.objects.get_or_create(user=user)
profile.phone_number = '9876543210'
profile.vehicle_type = 'Bike'
profile.vehicle_number = 'AP 09 BK 5555'
profile.is_active = True
profile.is_online = True
profile.save()

print(f"SUCCESS: Delivery Partner '{username}' created with password '{password}'!")
