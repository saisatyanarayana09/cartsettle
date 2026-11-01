from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


class SafeJWTAuthentication(JWTAuthentication):
    """
    SafeJWTAuthentication catches InvalidToken / AuthenticationFailed and returns None,
    allowing DRF to treat the caller as an AnonymousUser.
    
    However, if a user is actively banned/locked, it will explicitly raise an AuthenticationFailed
    to instantly sever their active session and kick them to the login screen.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user and getattr(user, 'is_locked', False):
            raise AuthenticationFailed('This account has been suspended by a store administrator.')
        return user

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except AuthenticationFailed as e:
            # Propagate the ban error to force a 401 logout
            if 'suspended' in str(e):
                raise e
            return None
        except InvalidToken:
            return None
