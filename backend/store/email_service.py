import base64
import hashlib
import threading
from datetime import datetime
from cryptography.fernet import Fernet
from django.conf import settings
from django.core.mail import EmailMessage, EmailMultiAlternatives, get_connection
from django.core.mail.backends.smtp import EmailBackend


def get_fernet_cipher():
    """Derives a deterministic 32-byte Fernet key from Django's SECRET_KEY."""
    secret = getattr(settings, 'SECRET_KEY', 'narendra-kirana-secure-fallback-key')
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode('utf-8')).digest())
    return Fernet(key)


def encrypt_secret(plain_text: str) -> str:
    """Encrypts a string (e.g. 16-character Google App Password) at rest."""
    if not plain_text:
        return ""
    cipher = get_fernet_cipher()
    return cipher.encrypt(plain_text.strip().encode('utf-8')).decode('utf-8')


def decrypt_secret(cipher_text: str) -> str:
    """Decrypts an encrypted string."""
    if not cipher_text:
        return ""
    try:
        cipher = get_fernet_cipher()
        return cipher.decrypt(cipher_text.strip().encode('utf-8')).decode('utf-8')
    except Exception:
        return ""


def get_active_email_connection():
    """
    Returns (connection, from_email_string).
    Uses StoreEmailSettings if active and configured, otherwise falls back to settings.py.
    """
    from .models import StoreEmailSettings
    try:
        email_settings = StoreEmailSettings.load()
        if email_settings.is_active and email_settings.sender_email:
            plain_password = email_settings.get_decrypted_password()
            if plain_password:
                backend = EmailBackend(
                    host=email_settings.smtp_host or 'smtp.gmail.com',
                    port=int(email_settings.smtp_port or 587),
                    username=email_settings.sender_email.strip(),
                    password=plain_password.strip(),
                    use_tls=bool(email_settings.use_tls),
                    use_ssl=bool(email_settings.use_ssl),
                    timeout=15,
                )
                from_email = email_settings.get_from_email_string()
                return backend, from_email
    except Exception as e:
        print("Dynamic email connection error, falling back to default:", str(e))

    default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@narendra-kirana.com')
    return get_connection(), default_from


def send_store_email(subject, message, recipient_list, from_email=None, html_message=None, fail_silently=False):
    """
    Sends an email using the active store SMTP settings or default fallback backend.
    """
    connection, default_from = get_active_email_connection()
    sender = from_email or default_from

    if isinstance(recipient_list, str):
        recipient_list = [recipient_list]

    # Filter invalid recipient strings
    valid_recipients = [r.strip() for r in recipient_list if r and '@' in r]
    if not valid_recipients:
        return 0

    if html_message:
        email = EmailMultiAlternatives(
            subject=subject,
            body=message or "",
            from_email=sender,
            to=valid_recipients,
            connection=connection,
        )
        email.attach_alternative(html_message, "text/html")
        return email.send(fail_silently=fail_silently)
    else:
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=sender,
            to=valid_recipients,
            connection=connection,
        )
        return email.send(fail_silently=fail_silently)


def send_store_email_async(subject, message, recipient_list, from_email=None, html_message=None, fail_silently=True):
    """
    Dispatches email asynchronously in a daemon thread so API responses return immediately.
    """
    def _run():
        try:
            send_store_email(
                subject=subject,
                message=message,
                recipient_list=recipient_list,
                from_email=from_email,
                html_message=html_message,
                fail_silently=fail_silently,
            )
        except Exception as e:
            print("Async store email dispatch error:", str(e))

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return thread


def test_smtp_connection(to_email: str, config_override: dict = None):
    """
    Verifies SMTP connection and sends a test email to `to_email`.
    Returns (success: bool, message: str).
    """
    from .models import StoreEmailSettings
    host = 'smtp.gmail.com'
    port = 587
    try:
        if config_override and config_override.get('sender_email'):
            host = config_override.get('smtp_host') or 'smtp.gmail.com'
            port = int(config_override.get('smtp_port') or 587)
            user = (config_override.get('sender_email') or '').strip()
            raw_pwd = (config_override.get('app_password') or '').strip()
            
            # If no password passed in override, fall back to existing saved password
            pass
            pass
            pass

            pass
            if not raw_pwd or all(c in ('•', '*') for c in raw_pwd):
                saved_cfg = StoreEmailSettings.load()
                saved_host = (saved_cfg.smtp_host or 'smtp.gmail.com').strip().lower()
                saved_user = (saved_cfg.sender_email or '').strip().lower()
                if host.strip().lower() == saved_host and user.lower() == saved_user:
                    raw_pwd = saved_cfg.get_decrypted_password()
                else:
                    raw_pwd = ""
            if not raw_pwd:
                return False, "Please provide the 16-character Google App Password to test."
            import ipaddress
            host_clean = host.strip().lower()
            if host_clean in ('localhost', '0.0.0.0'):
                return False, "Invalid SMTP host."
            try:
                ip_obj = ipaddress.ip_address(host_clean)
                if ip_obj.is_loopback or ip_obj.is_private or ip_obj.is_link_local or ip_obj.is_reserved:
                    return False, "Private or loopback SMTP hosts are not permitted."
            except ValueError:
                pass

            use_tls = bool(config_override.get('use_tls', True))
            use_ssl = bool(config_override.get('use_ssl', False))
            sender_name = config_override.get('sender_name') or 'Narendra Kirana'
            from_email = f"{sender_name} <{user}>" if sender_name else user
            backend = EmailBackend(
                host=host,
                port=port,
                username=user,
                password=raw_pwd,
                use_tls=use_tls,
                use_ssl=use_ssl,
                timeout=12,
            )
        else:
            cfg = StoreEmailSettings.load()
            raw_pwd = cfg.get_decrypted_password()
            if not cfg.sender_email or not raw_pwd:
                return False, "Store email or App Password has not been configured yet."
            host = cfg.smtp_host or 'smtp.gmail.com'
            port = int(cfg.smtp_port or 587)
            from_email = cfg.get_from_email_string()
            backend = EmailBackend(
                host=host,
                port=port,
                username=cfg.sender_email.strip(),
                password=raw_pwd.strip(),
                use_tls=bool(cfg.use_tls),
                use_ssl=bool(cfg.use_ssl),
                timeout=12,
            )

        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        email = EmailMessage(
            subject="✅ Test Email: Narendra Kirana SMTP Verified",
            body=(
                f"Hello,\n\n"
                f"Your Narendra Kirana Store Email & App Password configuration is working perfectly!\n\n"
                f"• Verified at: {now_str}\n"
                f"• Outgoing Email: {from_email}\n\n"
                f"All customer notifications, order updates, invoices, and password resets will now be sent seamlessly from this address without modifying code.\n\n"
                f"Best regards,\nNarendra Kirana Store Management"
            ),
            from_email=from_email,
            to=[to_email.strip()],
            connection=backend,
        )
        email.send(fail_silently=False)
        return True, f"Test email sent successfully to {to_email}! Please check your inbox or spam folder."
    except Exception as e:
        error_str = str(e)
        if "Username and Password not accepted" in error_str or "535" in error_str:
            return False, "Authentication failed (535): Google rejected your credentials. Please ensure you are using a 16-character Google App Password (not your normal account password)."
        if "Connection timed out" in error_str or "timeout" in error_str.lower():
            return False, f"Connection timed out connecting to {host}:{port}. Check port/TLS settings or network restrictions."
        return False, f"SMTP Error: {error_str}"
