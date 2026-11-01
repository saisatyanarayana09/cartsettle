from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.conf import settings
from django.utils.crypto import constant_time_compare
from django.utils.http import base36_to_int

class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.password}{timestamp}{user.is_active}"

    def check_token(self, user, token):
        """
        Check that an email verification token is correct for a given user,
        using EMAIL_VERIFICATION_TIMEOUT (3 days) instead of 15-minute PASSWORD_RESET_TIMEOUT.
        """
        if not (user and token):
            return False
        try:
            ts_b36, _ = token.split("-")
        except ValueError:
            return False

        try:
            ts = base36_to_int(ts_b36)
        except ValueError:
            return False

        # Check that the timestamp/uid has not been tampered with
        for secret in [self.secret, *self.secret_fallbacks]:
            if constant_time_compare(
                self._make_token_with_timestamp(user, ts, secret),
                token,
            ):
                break
        else:
            return False

        # Check the timestamp is within verification limit (3 days default)
        timeout = getattr(settings, 'EMAIL_VERIFICATION_TIMEOUT', 259200)
        if (self._num_seconds(self._now()) - ts) > timeout:
            return False

        return True

email_verification_token = EmailVerificationTokenGenerator()
