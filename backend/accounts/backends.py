from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailOrUsernameModelBackend(ModelBackend):
    """
    Custom authentication backend that allows users to authenticate
    using either their registered email address or their username.
    Works seamlessly across Django Admin (Render Server) and REST Framework (Owner Portal).
    Automatically ensures owner and staff permissions are kept in sync.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('email')
            
        if not username or not password:
            return None

        # Clean string
        identifier = str(username).strip()

        # Case-insensitive lookup on username or email
        user = User.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier)
        ).first()

        if user and user.check_password(password) and self.user_can_authenticate(user):
            # Auto-sync permissions for store operators:
            # If user is marked as owner or staff, guarantee they have both flags
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

            return user

        return None
