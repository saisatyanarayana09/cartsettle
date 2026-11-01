from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from .models import User, CustomerProfile, Address, DeliveryPartnerProfile

class CustomerProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = CustomerProfile
        fields = [
            'mobile_number', 'pickup_preference', 'dob', 'profile_picture',
            'avatar_url', 'avatar', 'referral_code', 'delete_requested'
        ]

    def get_avatar(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        if obj.avatar_url:
            return obj.avatar_url
        return None

class DeliveryPartnerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryPartnerProfile
        fields = [
            'id', 'phone_number', 'vehicle_type', 'vehicle_number', 
            'is_active', 'is_online', 'current_lat', 'current_lng', 
            'last_active_at', 'total_deliveries', 'created_at'
        ]

class UserSerializer(serializers.ModelSerializer):
    customer_profile = CustomerProfileSerializer(read_only=True)
    delivery_profile = DeliveryPartnerProfileSerializer(read_only=True)
    avatar = serializers.SerializerMethodField()
    profile_completion = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'is_customer', 'is_owner', 'is_staff', 'is_delivery_partner', 'phone_number', 'customer_profile', 
            'delivery_profile', 'password', 
            'profile_picture', 'avatar', 'profile_completion', 'is_active', 'failed_login_attempts', 
            'is_locked', 'locked_at', 'lockout_until', 'lockout_reason', 
            'last_failed_login_ip'
        ]
        read_only_fields = [
            'is_customer', 'is_owner', 'is_delivery_partner', 'is_active', 'id',
            'failed_login_attempts', 'is_locked', 'locked_at', 
            'lockout_until', 'lockout_reason', 'last_failed_login_ip'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False, 'validators': [validate_password]},
            'username': {'required': False},
            'email': {'required': False},
            'first_name': {'required': False},
        }

    profile_picture = serializers.ImageField(write_only=True, required=False)

    def get_avatar(self, obj):
        if hasattr(obj, 'customer_profile') and obj.customer_profile:
            profile = obj.customer_profile
            if profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.profile_picture.url)
                return profile.profile_picture.url
            if profile.avatar_url:
                return profile.avatar_url
        return None

    def get_phone_number(self, obj):
        if hasattr(obj, 'delivery_profile') and obj.delivery_profile and obj.delivery_profile.phone_number:
            return obj.delivery_profile.phone_number
        if hasattr(obj, 'customer_profile') and obj.customer_profile and obj.customer_profile.mobile_number:
            return obj.customer_profile.mobile_number
        return ''

    def get_profile_completion(self, obj):
        if not obj.is_customer:
            return None
        has_profile = hasattr(obj, 'customer_profile') and obj.customer_profile
        has_photo = bool(has_profile and (obj.customer_profile.profile_picture or obj.customer_profile.avatar_url))
        has_phone = bool(has_profile and obj.customer_profile.mobile_number and str(obj.customer_profile.mobile_number).strip())
        has_dob = bool(has_profile and obj.customer_profile.dob)
        has_name = bool(obj.first_name and obj.first_name.strip())
        has_email = bool(obj.email and obj.email.strip())

        steps = [
            {"id": "name", "label": "Full name", "completed": has_name, "weight": 20},
            {"id": "email", "label": "Email address", "completed": has_email, "weight": 20},
            {"id": "photo", "label": "Profile photo", "completed": has_photo, "weight": 20},
            {"id": "phone", "label": "Mobile number", "completed": has_phone, "weight": 20},
            {"id": "dob", "label": "Date of birth", "completed": has_dob, "weight": 20},
        ]
        percentage = sum(s["weight"] for s in steps if s["completed"])
        missing = [s["label"] for s in steps if not s["completed"]]
        return {
            "percentage": percentage,
            "steps": steps,
            "missing_steps": missing,
            "is_complete": percentage == 100,
        }

    def validate_profile_picture(self, value):
        if not value:
            return value
        if False:
            raise serializers.ValidationError("Invalid or corrupted image file.")
        
        # Security: Enforce max file size (5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Profile picture cannot exceed 5MB in size.")
            
        # Security: Enforce allowed MIME types
        allowed_formats = ['image/jpeg', 'image/png', 'image/webp']
        if getattr(value, 'content_type', None) not in allowed_formats:
            raise serializers.ValidationError("Only JPEG, PNG, and WebP images are allowed.")
            
        try:
            from PIL import Image, ImageOps
            import io
            from django.core.files.uploadedfile import InMemoryUploadedFile

            image = Image.open(value)
            image = ImageOps.exif_transpose(image)

            if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
                bg = Image.new('RGB', image.size, (255, 255, 255))
                bg.paste(image, mask=image.split()[-1])
                image = bg
            elif image.mode != 'RGB':
                image = image.convert('RGB')

            # 1:1 Aspect ratio center-crop
            w, h = image.size
            min_dim = min(w, h)
            left = (w - min_dim) // 2
            top = (h - min_dim) // 2
            right = left + min_dim
            bottom = top + min_dim
            image = image.crop((left, top, right, bottom))

            # Resize to max 512x512 with LANCZOS resampling
            if min_dim > 512:
                image = image.resize((512, 512), Image.Resampling.LANCZOS)

            output_io = io.BytesIO()
            image.save(output_io, format='JPEG', quality=85, optimize=True)
            output_io.seek(0)

            orig_name = getattr(value, 'name', 'avatar') or 'avatar'
            base_name = orig_name.rsplit('.', 1)[0]
            new_file_name = f"{base_name}.jpg"

            return InMemoryUploadedFile(
                output_io,
                None,
                new_file_name,
                'image/jpeg',
                output_io.getbuffer().nbytes,
                None
            )
        except Exception as e:
            print(f"Profile picture PIL optimization fallback: {e}")
            raise serializers.ValidationError("Invalid or corrupted image file.")

    def update(self, instance, validated_data):
        import json
        profile_data = self.initial_data.get('customer_profile', {})
        if isinstance(profile_data, str):
            try:
                profile_data = json.loads(profile_data)
            except json.JSONDecodeError:
                profile_data = {}
        
        # Update User fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        if not instance.is_customer:
            instance.username = validated_data.get('username', instance.username)
            instance.email = validated_data.get('email', instance.email)
        
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
            
        instance.save()

        # Update or Create CustomerProfile for profile picture & profile data
        if 'profile_picture' in validated_data or profile_data:
            if not hasattr(instance, 'customer_profile'):
                from .models import CustomerProfile
                CustomerProfile.objects.create(user=instance)

        if 'profile_picture' in validated_data:
            instance.customer_profile.profile_picture = validated_data.pop('profile_picture')
            instance.customer_profile.save()

        if hasattr(instance, 'customer_profile'):
            profile = instance.customer_profile
            if 'dob' in profile_data:
                new_dob = profile_data.get('dob')
                profile.dob = None if new_dob in ("", None) else new_dob

            if 'mobile_number' in profile_data:
                raw_mobile = profile_data.get('mobile_number')
                clean_mobile = None if raw_mobile in ("", None) else str(raw_mobile).strip()
                # Do not allow modifying mobile number once set
                if profile.mobile_number and profile.mobile_number.strip():
                    pass # Locked
                elif clean_mobile:
                    from .models import CustomerProfile
                    conflict = CustomerProfile.objects.filter(mobile_number=clean_mobile).exclude(id=profile.id).first()
                    if conflict:
                        raise serializers.ValidationError({
                            'customer_profile': {'mobile_number': ['This mobile number is already in use by another account.']}
                        })
                    profile.mobile_number = clean_mobile

            profile.save()
            
        return instance

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ('user', 'created_at')

class CustomerSignupSerializer(serializers.ModelSerializer):
    mobile_number = serializers.CharField(max_length=15, required=True, write_only=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    referral_code = serializers.CharField(max_length=20, required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'password', 'mobile_number', 'referral_code']

    def validate_mobile_number(self, value):
        if CustomerProfile.objects.filter(mobile_number=value).exists():
            raise serializers.ValidationError('A customer with this mobile number already exists.')
        return value

    def validate_referral_code(self, value):
        if value:
            referrer_profile = CustomerProfile.objects.filter(referral_code=value.upper()).first()
            if not referrer_profile:
                raise serializers.ValidationError('Invalid referral code.')
            
            # Check minimum spend requirement
            from offers.models import ReferralSettings
            settings = ReferralSettings.load()
            if settings.is_active and settings.require_min_spend and settings.min_spend_amount > 0:
                from django.utils import timezone
                from datetime import timedelta
                from django.db.models import Sum
                from orders.models import Order
                
                now = timezone.now()
                if settings.min_spend_period == 'WEEK':
                    start_date = now - timedelta(days=7)
                elif settings.min_spend_period == 'YEAR':
                    start_date = now - timedelta(days=365)
                else:
                    start_date = now - timedelta(days=30) # MONTH
                    
                total_spend = Order.objects.filter(
                    customer=referrer_profile.user,
                    status=Order.Status.COMPLETED,
                    created_at__gte=start_date
                ).aggregate(total=Sum('total_amount'))['total'] or 0
                
                if total_spend < settings.min_spend_amount:
                    raise serializers.ValidationError('This referral code is not active yet.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        mobile_number = validated_data.pop('mobile_number')
        password = validated_data.pop('password')
        referral_code = validated_data.pop('referral_code', None)
        validated_data['is_customer'] = True
        validated_data['is_owner'] = False
        
        user = User.objects.create(**validated_data)
        user.is_active = True
        user.set_password(password)
        user.save()

        # Send Activation Email
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail
        from django.conf import settings
        from .utils import email_verification_token
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)
        
        frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:5173'
        verify_link = f"{frontend_url}/verify-email?uid={uid}&token={token}"
        
        from store.email_service import send_store_email_async
        from .email_templates import build_account_activation_email
        email_data = build_account_activation_email(user, verify_link)
        send_store_email_async(
            subject=email_data['subject'],
            message=email_data['text'],
            recipient_list=[user.email],
            html_message=email_data['html'],
            fail_silently=True,
        )

        
        # Profile & Wallet
        CustomerProfile.objects.create(user=user, mobile_number=mobile_number)
        from .models import Wallet, WalletTransaction
        wallet = Wallet.objects.create(user=user)

        # Handle Referral Logic
        if referral_code:
            from offers.models import ReferralSettings, Referral
            settings = ReferralSettings.load()
            if settings.is_active:
                try:
                    referrer_profile = CustomerProfile.objects.get(referral_code=referral_code.upper())
                    referrer_user = referrer_profile.user
                    
                    # --- MEMORY CHECK FOR ABUSE ---
                    # Check if this mobile number belonged to a deleted account in the past
                    has_been_here_before = User.objects.filter(username__contains=f"del_{mobile_number}_").exists()
                    
                    if not has_been_here_before:
                        # Create Pending Referral ONLY if they are a truly new human
                        Referral.objects.create(
                            referrer=referrer_user,
                            referred_user=user,
                            status=Referral.Status.PENDING
                        )
                        
                        # Issue Referee Reward instantly
                        if settings.referee_reward > 0:
                            wallet.balance += settings.referee_reward
                            wallet.save()
                            WalletTransaction.objects.create(
                                wallet=wallet,
                                amount=settings.referee_reward,
                                transaction_type=WalletTransaction.TransactionType.REFERRAL_REWARD,
                                description=f"Welcome bonus for using referral code {referral_code.upper()}"
                            )
                    # --- END MEMORY CHECK ---
                except CustomerProfile.DoesNotExist:
                    pass

        return user

from .models import Wallet, WalletTransaction

class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = '__all__'

class WalletSerializer(serializers.ModelSerializer):
    transactions = serializers.SerializerMethodField()
    
    class Meta:
        model = Wallet
        fields = ['balance', 'transactions', 'updated_at']

    def get_transactions(self, obj):
        # We slice it here because slicing inside Django's Prefetch raises an error.
        # list() forces use of the prefetched cache rather than triggering a new DB query.
        return WalletTransactionSerializer(list(obj.transactions.all())[:50], many=True).data
