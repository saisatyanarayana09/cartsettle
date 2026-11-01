import logging
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import redirect
from django.contrib.auth import login

logger = logging.getLogger(__name__)
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, Address, CustomerProfile
from .serializers import CustomerSignupSerializer, UserSerializer, AddressSerializer

from rest_framework.throttling import AnonRateThrottle

class CustomerSignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = CustomerSignupSerializer
    throttle_classes = [AnonRateThrottle]

    

from rest_framework import exceptions
from django.utils import timezone
from datetime import timedelta
import secrets

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Support either 'username', 'email', or 'emailOrUsername' from frontend
        identifier = attrs.get(self.username_field) or self.initial_data.get('email') or self.initial_data.get('emailOrUsername')
        if identifier:
            attrs[self.username_field] = str(identifier).strip()

        # Extract client IP address
        request = self.context.get('request')
        ip_address = '127.0.0.1'
        if request:
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded:
                ip_address = x_forwarded.split(',')[0].strip()
            else:
                ip_address = request.META.get('REMOTE_ADDR') or '127.0.0.1'

        # Locate target user if exists for security checks
        target_user = None
        if identifier:
            target_user = User.objects.filter(username__iexact=str(identifier).strip()).first()
            if not target_user:
                target_user = User.objects.filter(email__iexact=str(identifier).strip()).first()

        # Check if account is locked
        if target_user and target_user.is_locked:
            # Auto-expire lockout if duration passed
            if target_user.lockout_until and timezone.now() >= target_user.lockout_until:
                target_user.is_locked = False
                target_user.failed_login_attempts = 0
                target_user.lockout_until = None
                target_user.lockout_reason = ''
                target_user.save(update_fields=['is_locked', 'failed_login_attempts', 'lockout_until', 'lockout_reason'])
            else:
                if target_user.lockout_until is None:
                    raise exceptions.PermissionDenied('This account has been suspended by a store administrator. Please contact store support.')
                else:
                    raise exceptions.PermissionDenied('Your account has been temporarily locked due to excessive failed login attempts. Please reset your password or wait 30 minutes.')

        # Check if account is not activated yet
        if target_user and not target_user.is_active:
            password = attrs.get('password')
            if password and target_user.check_password(password):
                raise exceptions.AuthenticationFailed({
                    'detail': 'Your account has not been activated yet. Please verify your email to log in.',
                    'code': 'account_inactive',
                    'email': target_user.email
                })

        try:
            data = super().validate(attrs)
        except exceptions.AuthenticationFailed as auth_err:
            if target_user:
                target_user.failed_login_attempts += 1
                target_user.last_failed_login_at = timezone.now()
                target_user.last_failed_login_ip = ip_address

                if target_user.failed_login_attempts >= 10 and not target_user.is_locked:
                    target_user.is_locked = True
                    target_user.locked_at = timezone.now()
                    target_user.lockout_until = timezone.now() + timedelta(minutes=30)
                    target_user.lockout_reason = f"10 consecutive failed login attempts from IP {ip_address}."
                    target_user.save(update_fields=[
                        'failed_login_attempts', 'last_failed_login_at', 'last_failed_login_ip',
                        'is_locked', 'locked_at', 'lockout_until', 'lockout_reason'
                    ])

                    # Trigger automated notification to owner/admin
                    try:
                        from notifications.models import Notification
                        from store.email_service import send_store_email_async
                        from .email_templates import build_account_locked_admin_email

                        owners = User.objects.filter(is_staff=True) | User.objects.filter(is_owner=True)
                        owners = owners.distinct()
                        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                        dashboard_url = f"{frontend_url}/owner/customers"

                        for owner in owners:
                            Notification.objects.create(
                                user=owner,
                                title=f"⚠️ Security Alert: Account Locked ({target_user.username})",
                                message=f"Account {target_user.username} ({target_user.email}) was locked after 10 failed login attempts from IP {ip_address}."
                            )
                            if owner.email:
                                admin_email = build_account_locked_admin_email(
                                    locked_user=target_user,
                                    attempts=target_user.failed_login_attempts,
                                    ip_address=ip_address,
                                    locked_at=target_user.locked_at,
                                    reason=target_user.lockout_reason,
                                    dashboard_url=dashboard_url
                                )
                                send_store_email_async(
                                    subject=admin_email['subject'],
                                    message=admin_email['text'],
                                    recipient_list=[owner.email],
                                    html_message=admin_email['html'],
                                    fail_silently=True
                                )
                    except Exception as notify_err:
                        print("Failed to dispatch admin lockout notification:", notify_err)

                    raise exceptions.PermissionDenied(
                        'Your account has been locked due to 10 consecutive failed login attempts. '
                        'Please reset your password or contact store support.'
                    )
                else:
                    target_user.save(update_fields=['failed_login_attempts', 'last_failed_login_at', 'last_failed_login_ip'])
                    remaining = 10 - target_user.failed_login_attempts
                    if remaining <= 3:
                        raise exceptions.AuthenticationFailed(
                            f'Invalid credentials. Warning: {remaining} attempt(s) remaining before account lockout.'
                        )

            raise auth_err

        user = self.user

        # Reset failed attempts and lockout on successful authentication
        if user.failed_login_attempts > 0 or user.is_locked:
            user.failed_login_attempts = 0
            user.is_locked = False
            user.lockout_until = None
            user.lockout_reason = ''
            user.save(update_fields=['failed_login_attempts', 'is_locked', 'lockout_until', 'lockout_reason'])

        # Auto-sync permissions for store operators
        needs_update = False
        fields_to_update = []
        if getattr(user, 'is_owner', False) and not user.is_staff:
            user.is_staff = True
            needs_update = True
            fields_to_update.append('is_staff')
        if (user.is_staff or user.is_superuser) and not getattr(user, 'is_owner', False):
            user.is_owner = True
            needs_update = True
            fields_to_update.append('is_owner')
        if needs_update:
            user.save(update_fields=fields_to_update)

        data['user'] = UserSerializer(user).data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AnonRateThrottle]

from django.db import models, transaction
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import os
import secrets

def _verify_google_credential(token, token_type='id_token'):
    """
    Verifies a Google access_token or id_token.
    Returns a dictionary with email, first_name, last_name, picture.
    """
    if not token:
        raise ValueError("No credential provided.")

    if token_type == 'access_token':
        import requests
        response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {token}'},
            timeout=8
        )
        if not response.ok:
            raise ValueError('Invalid Google access token.')
        info = response.json()
        if info.get('email_verified') is False:
            raise ValueError('Google email address is not verified.')
        email = info.get('email')
        if not email:
            raise ValueError('Google account has no email address.')
        return {
            'email': email.strip().lower(),
            'first_name': info.get('given_name') or info.get('name') or '',
            'last_name': info.get('family_name') or '',
            'picture': info.get('picture') or '',
        }
    else:
        client_id = os.getenv('GOOGLE_CLIENT_ID') or DEFAULT_ADMIN_GOOGLE_CLIENT_ID
        if client_id:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        else:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
        if idinfo.get('email_verified') is False:
            raise ValueError('Google email address is not verified.')
        email = idinfo.get('email')
        if not email:
            raise ValueError('Google account has no email address.')
        return {
            'email': email.strip().lower(),
            'first_name': idinfo.get('given_name') or idinfo.get('name') or '',
            'last_name': idinfo.get('family_name') or '',
            'picture': idinfo.get('picture') or '',
        }

class GoogleCustomerAuthView(APIView):
    """
    Google authentication for customers.
    - If user exists: logs in, syncs customer flags, profiles, and wallet.
    - If user is new: auto-registers customer with verified email, creates wallet & profile, and applies referral if present.
    """
    permission_classes = (AllowAny,)
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        token = request.data.get('credential')
        token_type = request.data.get('token_type', 'id_token')
        mobile_number = (request.data.get('mobile_number') or '').strip()
        referral_code = (request.data.get('referral_code') or '').strip().upper()

        if not token:
            return Response({'detail': 'No credential provided.'}, status=400)

        try:
            google_user = _verify_google_credential(token, token_type)
        except ValueError as val_err:
            return Response({'detail': str(val_err)}, status=400)
        except Exception as err:
            logger.error(f"Google customer verify error: {err}")
            return Response({'detail': 'Could not verify Google account.'}, status=400)

        email = google_user['email']
        first_name = google_user['first_name']
        last_name = google_user['last_name']
        picture = google_user.get('picture', '')

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.filter(username__iexact=email).first()

        from .models import CustomerProfile, Wallet, PendingApkReferral
        has_mobile = False
        if user and hasattr(user, 'customer_profile') and user.customer_profile:
            has_mobile = bool(user.customer_profile.mobile_number and str(user.customer_profile.mobile_number).strip())

        # If user is new OR missing mobile number, and no mobile_number was passed in request:
        if not has_mobile and not mobile_number:
            detected_ref = referral_code
            if not detected_ref:
                client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
                if client_ip:
                    from datetime import timedelta
                    from django.utils import timezone
                    recent = PendingApkReferral.objects.filter(
                        ip_address=client_ip,
                        created_at__gte=timezone.now() - timedelta(hours=48)
                    ).first()
                    if recent:
                        detected_ref = recent.referral_code

            return Response({
                'requires_mobile': True,
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'picture': picture,
                'referral_code': detected_ref or ''
            }, status=200)

        # If mobile_number was required and passed, validate 10 digits
        clean_mobile = None
        if not has_mobile:
            import re
            digits = re.sub(r'[^0-9]', '', mobile_number)
            if len(digits) == 12 and digits.startswith('91'):
                digits = digits[2:]
            if not (len(digits) == 10 and digits[0] in '6789'):
                return Response({'detail': 'Please enter a valid 10-digit mobile number.'}, status=400)
            clean_mobile = digits

            conflict = CustomerProfile.objects.filter(mobile_number=clean_mobile)
            if user:
                conflict = conflict.exclude(user=user)
            if conflict.exists():
                return Response({'detail': 'This mobile number is already registered with another account.'}, status=400)

        if not user:
            is_new = True
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username__iexact=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User.objects.create(
                username=username,
                email=email,
                first_name=first_name or '',
                last_name=last_name or '',
                is_customer=True,
                is_active=True,
            )
            user.set_unusable_password()
            user.save()
        else:
            is_new = False

        with transaction.atomic():
            user.save()

            if user.is_locked or (not is_new and not user.is_active):
                return Response({
                    'detail': 'Your account has been locked. Please contact store support.'
                }, status=403)

            fields_to_save = []
            if not user.is_customer:
                user.is_customer = True
                fields_to_save.append('is_customer')
            if not user.is_active or getattr(user, 'is_locked', False):
                user.is_active = True
                fields_to_save.append('is_active')
            if not user.first_name and first_name:
                user.first_name = first_name
                fields_to_save.append('first_name')
            if not user.last_name and last_name:
                user.last_name = last_name
                fields_to_save.append('last_name')
            if fields_to_save:
                user.save(update_fields=fields_to_save)

            profile, _ = CustomerProfile.objects.get_or_create(user=user)
            profile_save_fields = []
            if clean_mobile and not profile.mobile_number:
                profile.mobile_number = clean_mobile
                profile_save_fields.append('mobile_number')
            if picture and not profile.avatar_url:
                profile.avatar_url = picture
                profile_save_fields.append('avatar_url')
            if profile_save_fields:
                profile.save(update_fields=profile_save_fields)

            wallet, _ = Wallet.objects.get_or_create(user=user)

            # Referral processing for new customers
            if is_new and referral_code:
                try:
                    referrer_profile = CustomerProfile.objects.filter(referral_code=referral_code).first()
                    if referrer_profile and referrer_profile.user != user:
                        from offers.models import ReferralSettings, Referral
                        settings = ReferralSettings.load()
                        if settings.is_active:
                            Referral.objects.create(
                                referrer=referrer_profile.user,
                                referred_user=user,
                                status=Referral.Status.PENDING
                            )
                            if settings.referee_reward > 0:
                                wallet.balance += settings.referee_reward
                                wallet.save(update_fields=['balance'])
                except Exception as ref_err:
                    logger.warning(f"Google auth referral bonus error: {ref_err}")

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user, context={'request': request}).data,
            'is_new': is_new
        })

class GoogleDeliveryLoginView(APIView):
    """
    Google authentication for delivery partners.
    Requires the Google email to match an existing registered delivery partner account.
    """
    permission_classes = (AllowAny,)
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        token = request.data.get('credential')
        token_type = request.data.get('token_type', 'id_token')

        if not token:
            return Response({'detail': 'No credential provided.'}, status=400)

        try:
            google_user = _verify_google_credential(token, token_type)
        except ValueError as val_err:
            return Response({'detail': str(val_err)}, status=400)
        except Exception as err:
            logger.error(f"Google delivery verify error: {err}")
            return Response({'detail': 'Could not verify Google account.'}, status=400)

        email = google_user['email']

        user = User.objects.filter(
            models.Q(email__iexact=email) | models.Q(username__iexact=email)
        ).first()

        is_partner = bool(
            user and (
                user.is_delivery_partner or
                getattr(user, 'is_owner', False) or
                user.is_staff or
                user.is_superuser
            )
        )

        if not user or not is_partner:
            return Response({
                'detail': f'Access denied. No Delivery Partner account is registered with this Google account ({email}). Please contact the store owner to register your account.'
            }, status=403)

        if not user.is_active or getattr(user, 'is_locked', False):
            return Response({
                'detail': 'Your delivery partner account has been deactivated. Contact the store owner.'
            }, status=403)

        if hasattr(user, 'delivery_profile') and user.delivery_profile and not user.delivery_profile.is_active:
            return Response({
                'detail': 'Your delivery partner profile is currently inactive. Contact the store owner.'
            }, status=403)

        if not user.email:
            user.email = email
            user.save(update_fields=['email'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })

class GoogleOwnerLoginView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        token = request.data.get('credential')
        token_type = request.data.get('token_type', 'id_token')
        
        if not token:
            return Response({'detail': 'No credential provided'}, status=400)
            
        try:
            google_user = _verify_google_credential(token, token_type)
            email = google_user['email']

            # Check if user exists and has owner or staff permissions
            user = User.objects.filter(email__iexact=email).first()
            if not user or not (getattr(user, 'is_owner', False) or user.is_staff or user.is_superuser):
                return Response({'detail': f'No owner/staff account associated with Google account {email}.'}, status=403)
            if not user.is_active or getattr(user, 'is_locked', False):
                return Response({'detail': 'Your owner/staff account has been deactivated or locked.'}, status=403)
                
            # Auto-sync permissions
            needs_update = False
            fields_to_update = []
            if not getattr(user, 'is_owner', False):
                user.is_owner = True
                needs_update = True
                fields_to_update.append('is_owner')
            if not user.is_staff:
                user.is_staff = True
                needs_update = True
                fields_to_update.append('is_staff')
            if needs_update:
                user.save(update_fields=fields_to_update)

            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
            
        except ValueError as val_err:
            return Response({'detail': str(val_err)}, status=400)
        except Exception as e:
            return Response({'detail': str(e)}, status=500)

class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_object(self):
        return self.request.user

from accounts.permissions import IsOwnerUser

class CustomerListView(generics.ListAPIView):
    permission_classes = (IsOwnerUser,)
    serializer_class = UserSerializer
    pagination_class = None

    def get_queryset(self):
        qs = User.objects.filter(is_customer=True).select_related('customer_profile', 'delivery_profile').order_by('-date_joined')
        status_param = self.request.query_params.get('status')
        if status_param == 'locked':
            qs = qs.filter(is_locked=True)
        elif status_param == 'active':
            qs = qs.filter(is_active=True, is_locked=False)
        elif status_param == 'inactive':
            qs = qs.filter(is_active=False)
        elif status_param == 'delete_requested':
            qs = qs.filter(customer_profile__delete_requested=True)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        from django.db.models import Count, Q
        counts = User.objects.filter(is_customer=True).aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(is_active=True, is_locked=False)),
            inactive=Count('id', filter=Q(is_active=False)),
            locked=Count('id', filter=Q(is_locked=True)),
            delete_requested=Count('id', filter=Q(customer_profile__delete_requested=True))
        )
        
        return Response({
            'customers': serializer.data,
            'counts': counts,
            'results': serializer.data
        })

class AddressViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False) or not getattr(self.request, 'user', None) or not self.request.user.is_authenticated:
            return Address.objects.none()
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user=self.request.user).exclude(pk=serializer.instance.pk).update(is_default=False)
        serializer.save()

from django.db.models import Prefetch
from .serializers import WalletSerializer
from .models import Wallet, WalletTransaction

class WalletView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WalletSerializer

    def get_object(self):
        try:
            return Wallet.objects.prefetch_related(
                Prefetch('transactions', queryset=WalletTransaction.objects.order_by('-created_at'))
            ).get(user=self.request.user)
        except Wallet.DoesNotExist:
            return Wallet.objects.create(user=self.request.user)


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from .utils import email_verification_token

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        
        if not uidb64 or not token:
            return Response({'error': 'Missing parameters.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and email_verification_token.check_token(user, token):
            if user.is_active:
                return Response({'message': 'Account is already active.'}, status=status.HTTP_200_OK)
            user.is_active = True
            user.save()
            return Response({'message': 'Account activated successfully.'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Activation link is invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)


class ResendActivationEmailView(APIView):
    """
    Allows customers whose initial verification email was lost or expired to request
    a fresh activation link.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        identifier = (request.data.get('email') or request.data.get('identifier') or '').strip()
        if not identifier:
            return Response({'error': 'Email address or username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=identifier).first()
        if not user:
            user = User.objects.filter(username__iexact=identifier).first()

        if not user or not user.email:
            # Return uniform friendly message for security / account enumeration protection
            return Response({
                'message': 'If an inactive account associated with that email exists, a verification link has been sent.'
            }, status=status.HTTP_200_OK)

        if user.is_active:
            return Response({
                'message': 'This account is already active. Please sign in with your password.'
            }, status=status.HTTP_200_OK)

        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from store.email_service import send_store_email_async
        from .email_templates import build_account_activation_email

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verify_link = f"{frontend_url}/verify-email?uid={uid}&token={token}"

        email_data = build_account_activation_email(user, verify_link)
        send_store_email_async(
            subject=email_data['subject'],
            message=email_data['text'],
            recipient_list=[user.email],
            html_message=email_data['html'],
            fail_silently=True,
        )

        return Response({
            'message': 'A fresh activation link has been sent to your email address.'
        }, status=status.HTTP_200_OK)

import hashlib
import django.contrib.auth
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from .models import PasswordResetOTP, PasswordResetToken
from .email_templates import (
    build_password_reset_email,
    build_password_reset_otp_email,
    build_password_reset_link_email
)
from django.contrib.auth.password_validation import validate_password

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        portal = str(request.data.get('portal', 'customer') or 'customer').strip().lower()
        raw_method = request.data.get('method', 'link')
        method = str(raw_method or 'link').strip().lower()
        if method not in ('otp', 'link'):
            method = 'link'

        print(f"[PasswordResetRequest] email={email} portal={portal} method={method}")

        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email__iexact=email).first()
        if user:
            # If portal is owner, verify user is an owner, staff, or superuser
            is_owner_account = bool(user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser)
            if portal == 'owner' and not is_owner_account:
                # Do not send owner reset link/OTP to non-owner accounts; safely return generic response
                return Response({
                    'message': 'If an owner account with that email exists, password reset instructions have been sent.',
                    'method': method
                }, status=status.HTTP_200_OK)

            from store.email_service import send_store_email_async

            # Extract client IP & User-Agent
            ip_address = '127.0.0.1'
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded:
                ip_address = x_forwarded.split(',')[0].strip()
            else:
                ip_address = request.META.get('REMOTE_ADDR') or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]

            if method == 'otp':
                # Explicit method: 'otp'
                otp_code = f"{secrets.randbelow(900000) + 100000}"

                # Invalidate prior active OTPs for this user and portal
                PasswordResetOTP.objects.filter(user=user, portal=portal, is_used=False).update(is_used=True)

                # Persist the new OTP with strict 15-minute expiration
                PasswordResetOTP.objects.create(
                    user=user,
                    otp_code=otp_code,
                    portal=portal,
                    expires_at=timezone.now() + timedelta(minutes=15),
                    ip_address=ip_address
                )

                email_payload = build_password_reset_otp_email(
                    user=user,
                    otp_code=otp_code,
                    portal=portal
                )
                send_store_email_async(
                    subject=email_payload['subject'],
                    message=email_payload['text'],
                    recipient_list=[user.email],
                    html_message=email_payload['html'],
                    fail_silently=True,
                )
                return Response({
                    'message': 'A 6-digit verification code has been sent to your email.',
                    'method': 'otp'
                }, status=status.HTTP_200_OK)

            else:
                # Default method: 'link'
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                raw_token = secrets.token_urlsafe(32)
                token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

                # Invalidate prior active reset tokens for this user and portal
                PasswordResetToken.objects.filter(user=user, portal=portal, is_used=False).update(is_used=True)

                # Persist token with strict 15-minute expiration
                PasswordResetToken.objects.create(
                    user=user,
                    token_hash=token_hash,
                    portal=portal,
                    expires_at=timezone.now() + timedelta(minutes=15),
                    ip_address=ip_address,
                    user_agent=user_agent
                )

                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                if portal == 'owner':
                    reset_link = f"{frontend_url}/owner/reset-password?uid={uid}&token={raw_token}"
                else:
                    reset_link = f"{frontend_url}/reset-password?uid={uid}&token={raw_token}"

                email_payload = build_password_reset_link_email(
                    user=user,
                    reset_link=reset_link,
                    portal=portal
                )
                send_store_email_async(
                    subject=email_payload['subject'],
                    message=email_payload['text'],
                    recipient_list=[user.email],
                    html_message=email_payload['html'],
                    fail_silently=True,
                )
                return Response({
                    'message': 'A secure password reset link has been sent to your email.',
                    'method': 'link'
                }, status=status.HTTP_200_OK)

        # Always return generic success to prevent email enumeration
        generic_msg = 'A password reset link has been sent to your email.' if method == 'link' else 'A 6-digit verification code has been sent to your email.'
        return Response({'message': f'If an account with that email exists, {generic_msg.lower()}', 'method': method}, status=status.HTTP_200_OK)


class PasswordResetValidateTokenView(APIView):
    """
    Pre-flight health check for reset links without consuming the token.
    Allows the frontend to show immediate user feedback if a link is expired or used.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        portal = request.data.get('portal', 'customer')

        if not uidb64 or not token:
            return Response({'valid': False, 'error': 'Missing reset token parameters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'valid': False, 'error': 'The reset link is invalid or malformed.'}, status=status.HTTP_400_BAD_REQUEST)

        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        token_record = PasswordResetToken.objects.filter(user=user, token_hash=token_hash).first()

        if token_record:
            if token_record.is_used:
                return Response({'valid': False, 'error': 'This reset link has already been used. Please request a new link or enter your 6-digit OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
            if timezone.now() >= token_record.expires_at:
                return Response({'valid': False, 'error': 'This reset link has expired (15-minute limit). Please request a new link or enter your 6-digit OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
            if token_record.portal and portal and token_record.portal != portal:
                return Response({'valid': False, 'error': f'This reset link was issued for the {token_record.portal} portal and cannot be used here.'}, status=status.HTTP_403_FORBIDDEN)
            return Response({'valid': True, 'email': user.email}, status=status.HTTP_200_OK)

        if default_token_generator.check_token(user, token):
            return Response({'valid': True, 'email': user.email}, status=status.HTTP_200_OK)

        return Response({'valid': False, 'error': 'The reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        portal = request.data.get('portal', 'customer')
        
        if not uidb64 or not token or not new_password:
            return Response({'error': 'Missing required fields.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if not user:
            return Response({'error': 'The reset link is invalid or malformed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce password validation complexity
        try:
            validate_password(new_password, user=user)
        except Exception as e:
            msg = list(e.messages) if hasattr(e, 'messages') else [str(e)]
            return Response({'error': ' '.join(msg)}, status=status.HTTP_400_BAD_REQUEST)

        # Hash incoming token to query database
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        token_record = PasswordResetToken.objects.filter(user=user, token_hash=token_hash).first()

        is_valid = False
        if token_record:
            if token_record.is_used:
                return Response({'error': 'Link already used / expired. Please request a new link.'}, status=status.HTTP_400_BAD_REQUEST)
            if timezone.now() >= token_record.expires_at:
                return Response({'error': 'Reset link has expired (15-minute limit). Please request a new link.'}, status=status.HTTP_400_BAD_REQUEST)
            if token_record.portal and portal and token_record.portal != portal:
                return Response({'error': f'This reset link was generated for the {token_record.portal} portal and cannot be used here.'}, status=status.HTTP_403_FORBIDDEN)
            is_valid = True
        elif default_token_generator.check_token(user, token):
            # Backwards compatibility check for any legacy links
            is_valid = True

        if not is_valid:
            return Response({'error': 'Link already used / expired. Please request a new link.'}, status=status.HTTP_400_BAD_REQUEST)

        if portal == 'owner' and not (user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser):
            return Response({'error': 'This account does not have owner access.'}, status=status.HTTP_403_FORBIDDEN)

        # Update password
        user.set_password(new_password)
        # Only unlock if it was a temporary brute-force lock. Do not bypass permanent admin bans.
        if user.is_locked and user.lockout_until is not None:
            user.is_locked = False
            user.failed_login_attempts = 0
            user.lockout_until = None
            user.lockout_reason = ''
        user.save()

        # Mark token as used immediately (single-use enforcement)
        if token_record:
            token_record.is_used = True
            token_record.used_at = timezone.now()
            token_record.save(update_fields=['is_used', 'used_at'])

        # Invalidate all other pending reset tokens and OTPs for this user
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        # Revoke all outstanding active JWT refresh tokens across all devices
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            for outstanding in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            pass

        return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Token may be expired, invalid or already blacklisted
                pass

        # Flush any server-side Django session
        if hasattr(request, 'session'):
            request.session.flush()
        if request.user.is_authenticated:
            django.contrib.auth.logout(request)

        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class PasswordResetVerifyOTPView(APIView):
    """
    Step 1 of 2 in OTP Reset Flow:
    Validates that the provided 6-digit OTP matches an active, non-expired OTP record
    without consuming it, allowing the frontend to transition cleanly to the
    'Create New Password' step.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()
        portal = request.data.get('portal', 'customer')

        if not email or not otp:
            return Response({'valid': False, 'error': 'Email and 6-digit OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'valid': False, 'error': 'Invalid email or OTP code.'}, status=status.HTTP_400_BAD_REQUEST)

        if portal == 'owner' and not (user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser):
            return Response({'valid': False, 'error': 'This account does not have owner access.'}, status=status.HTTP_403_FORBIDDEN)

        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            portal=portal,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_record:
            otp_record = PasswordResetOTP.objects.filter(
                user=user,
                is_used=False
            ).order_by('-created_at').first()

        if not otp_record or not otp_record.is_valid():
            return Response({'valid': False, 'error': 'The OTP code is invalid or has expired (15-minute limit). Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce rate-limiting on OTP verification attempts (max 5)
        if otp_record.attempts >= 5:
            otp_record.is_used = True
            otp_record.save(update_fields=['is_used'])
            return Response({'valid': False, 'error': 'Too many failed OTP attempts. This code has been invalidated. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.otp_code != otp:
            otp_record.attempts += 1
            otp_record.save(update_fields=['attempts'])
            remaining = 5 - otp_record.attempts
            return Response({'valid': False, 'error': f'Incorrect OTP code. {remaining} attempt(s) remaining.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'valid': True,
            'email': user.email,
            'message': 'Code verified successfully. Please enter your new password.'
        }, status=status.HTTP_200_OK)


class PasswordResetOTPConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')
        portal = request.data.get('portal', 'customer')

        if not email or not otp or not new_password:
            return Response({'error': 'Email, OTP, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'Invalid email or OTP code.'}, status=status.HTTP_400_BAD_REQUEST)

        if portal == 'owner' and not (user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser):
            return Response({'error': 'This account does not have owner access.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            validate_password(new_password, user=user)
        except Exception as e:
            msg = list(e.messages) if hasattr(e, 'messages') else [str(e)]
            return Response({'error': ' '.join(msg)}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            portal=portal,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_record:
            otp_record = PasswordResetOTP.objects.filter(
                user=user,
                is_used=False
            ).order_by('-created_at').first()

        if not otp_record or not otp_record.is_valid():
            return Response({'error': 'The OTP code is invalid or has expired (15-minute limit). Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce rate-limiting on OTP verification attempts (max 5)
        if otp_record.attempts >= 5:
            otp_record.is_used = True
            otp_record.save(update_fields=['is_used'])
            return Response({'error': 'Too many failed OTP attempts. This code has been invalidated. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.otp_code != otp:
            otp_record.attempts += 1
            otp_record.save(update_fields=['attempts'])
            remaining = 5 - otp_record.attempts
            return Response({'error': f'Incorrect OTP code. {remaining} attempt(s) remaining.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark this OTP used immediately
        otp_record.is_used = True
        otp_record.save(update_fields=['is_used'])

        # Invalidate any other active OTPs and reset tokens for this user
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        # Reset user password and clear any brute-force lockout
        user.set_password(new_password)
        if user.is_locked and user.lockout_until is not None:
            user.is_locked = False
            user.failed_login_attempts = 0
            user.lockout_until = None
            user.lockout_reason = ''
        user.save()

        # Revoke all outstanding active JWT refresh tokens across all devices
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            for outstanding in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            pass

        return Response({'message': 'Password has been reset successfully. You can now log in with your new password.'}, status=status.HTTP_200_OK)


class AdminUnlockUserView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            user.is_locked = False
            user.failed_login_attempts = 0
            user.lockout_until = None
            user.lockout_reason = ''
            user.save(update_fields=['is_locked', 'failed_login_attempts', 'lockout_until', 'lockout_reason'])
            return Response({
                'message': f'Account {user.username} has been unlocked successfully.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class AdminLockUserView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            reason = request.data.get('reason') or f"Manually locked by administrator {request.user.username}"
            user.is_locked = True
            user.locked_at = timezone.now()
            user.lockout_reason = reason
            user.save(update_fields=['is_locked', 'locked_at', 'lockout_reason'])
            return Response({
                'message': f'Account {user.username} has been locked.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class AdminActivateUserView(APIView):
    """
    Allows the store owner to manually activate any customer account directly from
    the Owner Portal Customer Directory with 1 click.
    """
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            user.is_active = True
            user.failed_login_attempts = 0
            user.save(update_fields=['is_active', 'failed_login_attempts'])
            return Response({
                'message': f'Account {user.username} has been activated successfully.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class RequestDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required to request deletion.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not request.user.check_password(password):
            return Response({'error': 'Incorrect password.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        user = request.user
        if hasattr(user, 'customer_profile'):
            user.customer_profile.delete_requested = True
            user.customer_profile.save()
            return Response({'message': 'Account deletion requested successfully.'}, status=status.HTTP_200_OK)
        return Response({'error': 'Not a customer profile.'}, status=status.HTTP_400_BAD_REQUEST)

class ApproveDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_customer=True)
            if hasattr(user, 'customer_profile') and user.customer_profile.delete_requested:
                user.is_active = False
                
                # Free up the email and mobile for future signups, but STORE the mobile in username for memory
                old_mobile = user.customer_profile.mobile_number or "none"
                user.username = f"del_{old_mobile}_{user.username}"[:150]
                user.email = f"del_{user.id}_{user.email}"[:254]
                
                user.customer_profile.mobile_number = None
                user.customer_profile.delete_requested = False
                
                user.customer_profile.save()
                user.save()
                return Response({'message': 'Account successfully deactivated (soft deleted).'}, status=status.HTTP_200_OK)
            return Response({'error': 'User has not requested deletion.'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

class RejectDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_customer=True)
            if hasattr(user, 'customer_profile') and user.customer_profile.delete_requested:
                user.customer_profile.delete_requested = False
                user.customer_profile.save()
                return Response({'message': 'Account deletion request rejected.'}, status=status.HTTP_200_OK)
            return Response({'error': 'User has not requested deletion.'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


from orders.models import Order
from django.db.models import Sum

class OwnerCustomerDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def get(self, request, pk):
        try:
            customer_user = User.objects.get(pk=pk, is_customer=True)
            
            # 1. Base User Info
            serializer = UserSerializer(customer_user)
            data = serializer.data
            
            # 2. Wallet Balance
            wallet_balance = 0
            if hasattr(customer_user, 'wallet'):
                wallet_balance = float(customer_user.wallet.balance)
                
            # 3. Aggregated Sales (only non-rejected orders)
            orders = Order.objects.filter(customer=customer_user).exclude(status='REJECTED')
            total_orders = orders.count()
            total_spent = orders.aggregate(total=Sum('total_amount'))['total'] or 0
            
            # 4. Recent Orders
            recent_orders = orders.order_by('-created_at')[:5]
            recent_orders_data = [{
                'id': order.id,
                'created_at': order.created_at,
                'status': order.status,
                'total_amount': float(order.total_amount)
            } for order in recent_orders]
            
            # If customer is not active, generate the current activation link for the store owner
            if not customer_user.is_active:
                from django.utils.http import urlsafe_base64_encode
                from django.utils.encoding import force_bytes
                from .utils import email_verification_token
                uid = urlsafe_base64_encode(force_bytes(customer_user.pk))
                token = email_verification_token.make_token(customer_user)
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                data['activation_link'] = f"{frontend_url}/verify-email?uid={uid}&token={token}"
            else:
                data['activation_link'] = None

            return Response(data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)


DEFAULT_ADMIN_GOOGLE_CLIENT_ID = '729937153109-6e8fivp20b3ri2qsah1d6u2a7oi0uls6.apps.googleusercontent.com'

@csrf_exempt
def admin_google_login(request):
    if request.method == 'POST':
        token = request.POST.get('credential')
        if not token:
            return redirect('/admin/login/?error=missing_token')
            
        try:
            client_id = os.getenv('GOOGLE_CLIENT_ID', DEFAULT_ADMIN_GOOGLE_CLIENT_ID)
            email = None

            # 1. Verify via google.oauth2.id_token with clock skew tolerance
            try:
                idinfo = id_token.verify_oauth2_token(
                    token, 
                    google_requests.Request(), 
                    client_id, 
                    clock_skew_in_seconds=15
                )
                if idinfo.get('email_verified') is False:
                    raise ValueError('Google email address is not verified.')
                email = idinfo.get('email')
            except Exception as lib_err:
                logger.warning(f"Local id_token verification failed: {lib_err}. Trying Google tokeninfo API fallback.")

            # 2. Fallback to Google's official tokeninfo endpoint
            if not email:
                import requests
                resp = requests.get(f'https://oauth2.googleapis.com/tokeninfo?id_token={token}', timeout=10)
                if resp.ok:
                    info = resp.json()
                    aud = info.get('aud')
                    if not client_id or aud == client_id:
                        email = info.get('email')
                    else:
                        logger.error(f"Google token audience mismatch: expected {client_id}, got {aud}")
                else:
                    logger.error(f"Google tokeninfo request failed: {resp.status_code} {resp.text}")

            if not email:
                return redirect('/admin/login/?error=invalid_token')

            user = User.objects.filter(email__iexact=email).first()
            
            if user and user.is_active and not getattr(user, 'is_locked', False) and (user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser):
                # Auto-sync permissions
                needs_update = False
                fields_to_update = []
                if not user.is_staff:
                    user.is_staff = True
                    needs_update = True
                    fields_to_update.append('is_staff')
                if not getattr(user, 'is_owner', False):
                    user.is_owner = True
                    needs_update = True
                    fields_to_update.append('is_owner')
                if needs_update:
                    user.save(update_fields=fields_to_update)

                login(request, user)
                request.session.set_expiry(60 * 60 * 24 * 30)  # 30 days
                return redirect('/')
            else:
                return redirect('/admin/login/?error=unauthorized')
        except Exception as e:
            logger.error(f"admin_google_login unexpected error: {e}", exc_info=True)
            return redirect('/admin/login/?error=invalid_token')
    return redirect('/admin/login/')


class ReferralLookupView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            code = (request.query_params.get('code') or '').strip().upper()
            by_ip = request.query_params.get('ip') in ('true', '1', 'yes')

            # If no code but IP check requested, find pending referral from client IP
            if not code and by_ip:
                client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
                if client_ip:
                    from datetime import timedelta
                    from django.utils import timezone
                    from .models import PendingApkReferral
                    pending = PendingApkReferral.objects.filter(
                        ip_address=client_ip,
                        created_at__gte=timezone.now() - timedelta(hours=48)
                    ).first()
                    if pending:
                        code = pending.referral_code

            if not code:
                return Response({'error': 'No referral code provided'}, status=400)
                
            profile = CustomerProfile.objects.select_related('user').filter(referral_code__iexact=code).first()
            if not profile:
                return Response({'error': 'Invalid referral code'}, status=404)

            name = profile.user.first_name or profile.user.username
            return Response({
                'referrer_name': name,
                'referral_code': code.upper()
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class RecordDownloadReferralView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    permission_classes = [AllowAny]

    def post(self, request):
        code = (request.data.get('referral_code') or request.data.get('code') or '').strip().upper()
        if not code:
            return Response({'detail': 'No referral code provided'}, status=400)

        # Verify code exists
        if not CustomerProfile.objects.filter(referral_code__iexact=code).exists():
            return Response({'detail': 'Referral code does not exist'}, status=404)

        client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
        if not client_ip:
            return Response({'detail': 'Could not determine IP address'}, status=400)

        from .models import PendingApkReferral
        PendingApkReferral.objects.create(
            ip_address=client_ip,
            referral_code=code
        )
        return Response({'status': 'recorded', 'referral_code': code})

from .models import DeliveryPartnerProfile

class AgentManagementView(APIView):
    permission_classes = [IsOwnerUser]

    def get(self, request, user_id=None, *args, **kwargs):
        agents = User.objects.filter(
            models.Q(is_owner=True) | models.Q(is_staff=True) | models.Q(is_delivery_partner=True),
            is_active=True,
        ).distinct()
        serializer = UserSerializer(agents, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        if not request.user.is_owner:
            return Response({'error': 'Only store owners can add agents.'}, status=status.HTTP_403_FORBIDDEN)
        email = request.data.get('email')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        phone_number = request.data.get('phone_number')
        role = request.data.get('role')

        password = request.data.get('password')

        if not email or not role:
            return Response({'error': 'Email and role are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if role not in ['staff', 'delivery']:
            return Response({'error': 'Role must be staff or delivery.'}, status=status.HTTP_400_BAD_REQUEST)

        existing_inactive = User.objects.filter(models.Q(username__iexact=email) | models.Q(email__iexact=email), is_active=False).first()
        if existing_inactive:
            existing_inactive.first_name = first_name or existing_inactive.first_name
            existing_inactive.last_name = last_name or existing_inactive.last_name
            existing_inactive.is_active = True
            if role == 'staff':
                existing_inactive.is_owner = True
                existing_inactive.is_staff = True
            elif role == 'delivery':
                existing_inactive.is_delivery_partner = True
            if password:
                existing_inactive.set_password(password)
            existing_inactive.save()
            if role == 'delivery':
                dp, _ = DeliveryPartnerProfile.objects.get_or_create(user=existing_inactive)
                if phone_number:
                    dp.phone_number = phone_number
                    dp.save(update_fields=['phone_number'])
            elif phone_number:
                cp, _ = CustomerProfile.objects.get_or_create(user=existing_inactive)
                cp.mobile_number = phone_number
                cp.save(update_fields=['mobile_number'])
            return Response(UserSerializer(existing_inactive).data, status=status.HTTP_201_CREATED)
        if User.objects.filter(username__iexact=email).exists() or User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'User with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User(
            username=email,
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        
        if role == 'staff':
            user.is_owner = True
            user.is_staff = True
        elif role == 'delivery':
            user.is_delivery_partner = True
            
        user.save()
        
        if role == 'delivery':
            DeliveryPartnerProfile.objects.create(
                user=user,
                phone_number=phone_number
            )
            
        elif phone_number:
            cp, _ = CustomerProfile.objects.get_or_create(user=user)
            cp.mobile_number = phone_number
            cp.save(update_fields=['mobile_number'])
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def delete(self, request, user_id=None, *args, **kwargs):
        if not getattr(request.user, 'is_owner', False):
            return Response({'error': 'Only store owners can deactivate agents.'}, status=status.HTTP_403_FORBIDDEN)
        if not user_id:
            return Response({'error': 'User ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if str(user_id) == str(request.user.id):
            return Response({'error': 'You cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        if not user_id:
            return Response({'error': 'User ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(id=user_id)
            if user.is_superuser and not request.user.is_superuser:
                return Response({'error': 'Cannot deactivate a superuser account.'}, status=status.HTTP_403_FORBIDDEN)
            user.is_active = False
            user.save(update_fields=['is_active'])
            return Response({'message': 'User deactivated successfully.'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

