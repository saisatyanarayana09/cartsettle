"""
Responsive Transactional HTML Email Builder for Narendra Kirana
Adheres to modern responsive HTML email standards, bulletproof CTA buttons,
and explicit security/transparency fallback URLs.
"""
from django.utils.html import escape

def get_base_email_wrapper(title: str, preheader: str, content_html: str) -> str:
    """
    Wraps content inside a high-deliverability, responsive HTML email container
    compatible with Gmail, Outlook, Apple Mail, and mobile clients.
    """
    return f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>{escape(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
    body {{ height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    @media screen and (max-width: 600px) {{
      .email-container {{ width: 100% !important; padding: 12px !important; }}
      .content-cell {{ padding: 24px 16px !important; }}
      .otp-digit-box {{ font-size: 28px !important; letter-spacing: 6px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b;">
  <!-- Hidden Preheader Text -->
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: Open Sans, Helvetica, Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    {escape(preheader)}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: center;">
              <div style="display: inline-block; padding: 8px 16px; background-color: rgba(255, 255, 255, 0.08); border-radius: 30px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.12);">
                <span style="color: #ffffff; font-weight: 900; font-size: 16px; letter-spacing: 0.5px;">NARENDRA</span>
                <span style="color: #34d399; font-weight: 900; font-size: 16px; margin-left: 4px;">KIRANA</span>
              </div>
              <div style="color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                Grocery Essentials & Daily Store
              </div>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-cell" style="padding: 36px 32px; background-color: #ffffff;">
              {content_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 600;">
                Narendra Kirana Store &bull; Quality Groceries Delivered
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This is an automated transactional security message sent to your registered email address. If you have questions, please reach out to store support.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_password_reset_otp_email(user, otp_code: str, portal: str = 'customer') -> dict:
    """
    Builds a dedicated OTP-only transactional email with:
    - High-visibility 6-digit OTP code box
    - Clear 15-minute expiration notice
    - Security advisory (no confusing link buttons)
    """
    first_name = escape(user.first_name or user.username or "Customer")
    portal_label = "Owner / Management Portal" if portal == 'owner' else "Customer Account"
    title = f"Your Password Reset Code - {portal_label}"
    preheader = f"Your verification code is {otp_code}. Valid for 15 minutes."

    content_html = f"""
      <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
        One-Time Verification Code
      </h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
        Hello <strong>{first_name}</strong>,<br>
        You requested to reset your password using a 6-digit code for your Narendra Kirana <strong>{portal_label}</strong>.
      </p>

      <!-- 6-DIGIT OTP DISPLAY BOX -->
      <div style="background: #f8fafc; border: 2px dashed #059669; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-size: 11px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
          Your 6-Digit Reset Code
        </div>
        <div class="otp-digit-box" style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #0f172a; padding: 8px 0;">
          {otp_code}
        </div>
        <div style="display: inline-block; margin-top: 10px; font-size: 12px; font-weight: 700; color: #047857; background-color: #d1fae5; padding: 4px 14px; border-radius: 20px;">
          ⏱ Valid for 15 minutes &bull; Single-use only
        </div>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-top: 20px;">
        <div style="font-size: 12px; color: #334155; line-height: 1.5;">
          <strong>How to use this code:</strong> Return to the Narendra Kirana app or website, enter this 6-digit code on the reset password screen, and choose your new password.
        </div>
      </div>

      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          <strong>Security Notice:</strong> If you did not request this OTP, someone may have entered your email by mistake. Your account is safe and no changes have been made.
        </p>
      </div>
    """

    html = get_base_email_wrapper(title, preheader, content_html)
    plain_text = (
        f"Hello {user.first_name or user.username},\n\n"
        f"Your Narendra Kirana password reset code is:\n\n"
        f"  {otp_code}\n\n"
        f"(Valid for 15 minutes, single use)\n\n"
        f"Enter this code in the Narendra Kirana app or portal to complete your password reset.\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"Best regards,\nNarendra Kirana Security Team"
    )

    return {
        'subject': f"{otp_code} is your Narendra Kirana Password Reset Code",
        'html': html,
        'html_message': html,
        'text': plain_text,
        'message': plain_text
    }


def build_password_reset_link_email(user, reset_link: str, portal: str = 'customer') -> dict:
    """
    Builds a dedicated Link-only transactional email with:
    - Prominent primary CTA button
    - Domain transparency fallback URL
    - Clear 15-minute expiration notice (no OTP code box)
    """
    first_name = escape(user.first_name or user.username or "Customer")
    portal_label = "Owner / Management Portal" if portal == 'owner' else "Customer Account"
    title = f"Reset Password - {portal_label}"
    preheader = f"Click the link inside to reset your password. Valid for 15 minutes."

    content_html = f"""
      <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
        Password Reset Link
      </h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
        Hello <strong>{first_name}</strong>,<br>
        We received a request to reset the password for your Narendra Kirana <strong>{portal_label}</strong>. Click the button below to choose a new password:
      </p>

      <!-- BULLETPROOF CTA BUTTON -->
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{reset_link}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="25%" stroke="f" fillcolor="#4f46e5">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Reset Password</center>
        </v:roundrect>
        <![endif]-->
        <a href="{reset_link}" target="_blank" style="background-color: #4f46e5; border-radius: 12px; color: #ffffff; display: inline-block; font-size: 14px; font-weight: 800; line-height: 48px; text-align: center; text-decoration: none; width: 240px; -webkit-text-size-adjust: none; mso-hide: all; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
          Reset Password &rarr;
        </a>
      </div>

      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #b45309; background-color: #fef3c7; padding: 4px 12px; border-radius: 20px;">
          ⏱ Link expires in 15 minutes &bull; Single-use only
        </span>
      </div>

      <!-- SECURITY & TRANSPARENCY RAW FALLBACK URL -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-top: 24px;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px;">
          🔗 Raw Recovery URL (Security &amp; Domain Verification):
        </div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #334155; word-break: break-all; line-height: 1.4; background: #ffffff; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
          {reset_link}
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 6px;">
          If the button above does not open, copy and paste this exact link into your browser.
        </div>
      </div>

      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged and your account is secure.
        </p>
      </div>
    """

    html = get_base_email_wrapper(title, preheader, content_html)
    plain_text = (
        f"Hello {user.first_name or user.username},\n\n"
        f"You requested to reset your password for your Narendra Kirana {portal_label}.\n\n"
        f"Click the link below to set your new password (valid for 15 minutes):\n"
        f"{reset_link}\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"Best regards,\nNarendra Kirana Security Team"
    )

    return {
        'subject': "Reset your Narendra Kirana Password",
        'html': html,
        'html_message': html,
        'text': plain_text,
        'message': plain_text
    }


def build_password_reset_email(user, reset_link: str = '', otp_code: str = '', portal: str = 'customer') -> dict:
    """
    Backwards-compatible wrapper. Strictly isolates recovery methods:
    never renders both OTP and Reset Link in the same email.
    """
    if reset_link and not otp_code:
        return build_password_reset_link_email(user, reset_link, portal)
    if otp_code and not reset_link:
        return build_password_reset_otp_email(user, otp_code, portal)
    # If both are passed by legacy code, link takes priority for 1-click recovery
    if reset_link:
        return build_password_reset_link_email(user, reset_link, portal)
    return build_password_reset_otp_email(user, otp_code, portal)



def build_account_activation_email(user, verify_link: str) -> dict:
    """
    Builds a modern account activation verification email with:
    - Primary styled CTA button
    - Raw fallback link for security/domain transparency
    """
    first_name = escape(user.first_name or user.username or "Customer")
    title = "Verify Your Narendra Kirana Account"
    preheader = "Welcome to Narendra Kirana! Please verify your email address to activate your account."

    content_html = f"""
      <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
        Welcome to Narendra Kirana! 🎉
      </h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
        Hello <strong>{first_name}</strong>,<br>
        Thank you for joining Narendra Kirana! Please confirm your email address to activate your customer account and start shopping fresh groceries.
      </p>

      <!-- BULLETPROOF CTA BUTTON -->
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{verify_link}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="25%" stroke="f" fillcolor="#059669">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Activate Account</center>
        </v:roundrect>
        <![endif]-->
        <a href="{verify_link}" target="_blank" style="background-color: #059669; border-radius: 12px; color: #ffffff; display: inline-block; font-size: 14px; font-weight: 800; line-height: 48px; text-align: center; text-decoration: none; width: 240px; -webkit-text-size-adjust: none; mso-hide: all; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
          Activate Account &rarr;
        </a>
      </div>

      <!-- SECURITY & TRANSPARENCY RAW FALLBACK URL -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-top: 24px;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px;">
          🔗 Raw Activation Link (Domain Verification):
        </div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #334155; word-break: break-all; line-height: 1.4; background: #ffffff; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
          {verify_link}
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 6px;">
          If the button above does not open, copy and paste this exact link into your browser.
        </div>
      </div>
    """

    html = get_base_email_wrapper(title, preheader, content_html)
    plain_text = (
        f"Welcome to Narendra Kirana, {user.first_name or user.username}!\n\n"
        f"Please click the link below to activate your account:\n{verify_link}\n\n"
        f"Best regards,\nNarendra Kirana Team"
    )

    return {
        'subject': 'Activate Your Narendra Kirana Account',
        'html': html,
        'html_message': html,
        'text': plain_text,
        'message': plain_text
    }


def build_account_locked_admin_email(locked_user, attempts: int, ip_address: str, locked_at: str, reason: str, dashboard_url: str) -> dict:
    """
    Builds an automated security alert email sent to store owners/admins
    when an account is locked due to brute-force attempts.
    """
    title = f"Security Alert: Account #{locked_user.id} Locked"
    preheader = f"Account {locked_user.username} has been locked after {attempts} failed login attempts from IP {ip_address}."

    content_html = f"""
      <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 6px 0; color: #991b1b; font-size: 16px; font-weight: 800;">
          ⚠️ Brute-Force Lockout Triggered
        </h3>
        <p style="margin: 0; color: #b91c1c; font-size: 13px; line-height: 1.5;">
          An account on Narendra Kirana was automatically locked to prevent unauthorized access.
        </p>
      </div>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #334155; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; font-weight: 700; width: 140px; color: #64748b;">Target Account:</td>
          <td style="padding: 8px 0; font-weight: 800; color: #0f172a;">{escape(locked_user.username)} ({escape(locked_user.email)})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b;">Failed Attempts:</td>
          <td style="padding: 8px 0; font-weight: 800; color: #dc2626;">{attempts} consecutive attempts</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b;">Source IP Address:</td>
          <td style="padding: 8px 0; font-family: monospace; font-weight: 700;">{escape(ip_address or 'Unknown')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b;">Timestamp:</td>
          <td style="padding: 8px 0;">{escape(locked_at)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b;">Reason:</td>
          <td style="padding: 8px 0; color: #b45309; font-weight: 700;">{escape(reason)}</td>
        </tr>
      </table>

      <!-- CTA BUTTON -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="{dashboard_url}" target="_blank" style="background-color: #0f172a; border-radius: 12px; color: #ffffff; display: inline-block; font-size: 13px; font-weight: 800; line-height: 44px; text-align: center; text-decoration: none; padding: 0 28px;">
          Open Customers Dashboard &rarr;
        </a>
      </div>
    """

    html = get_base_email_wrapper(title, preheader, content_html)
    plain_text = (
        f"SECURITY ALERT: Account {locked_user.username} Locked\n\n"
        f"Reason: {reason}\n"
        f"Failed Attempts: {attempts}\n"
        f"IP Address: {ip_address}\n"
        f"Timestamp: {locked_at}\n\n"
        f"Manage and unlock via Owner Dashboard: {dashboard_url}"
    )

    return {
        'subject': f"⚠️ Security Alert: Account {locked_user.username} Locked ({attempts} failed attempts)",
        'html': html,
        'html_message': html,
        'text': plain_text,
        'message': plain_text
    }
