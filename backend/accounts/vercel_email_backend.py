import urllib.request
import json
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings
import os

class VercelHTTPSBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if not email_messages:
            return 0
            
        # Get credentials from Render environment variables
        host_user = os.environ.get('EMAIL_HOST_USER', '')
        host_pass = os.environ.get('EMAIL_HOST_PASSWORD', '')
        
        # Get frontend URL (Vercel)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://narendra-kirana.vercel.app')
        api_url = f"{frontend_url}/api/send-email"
        
        sent_count = 0
        for message in email_messages:
            try:
                # Prepare data to send to Vercel
                data = json.dumps({
                    "to": list(message.to)[0] if message.to else "",
                    "subject": message.subject,
                    "text": message.body,
                    "html": getattr(message, 'alternatives', [[None]])[0][0] if hasattr(message, 'alternatives') and message.alternatives else None,
                    "user": host_user,
                    "pass": host_pass
                }).encode('utf-8')
                
                req = urllib.request.Request(api_url, method='POST')
                req.add_header('Content-Type', 'application/json')
                
                # Make the HTTPS request to Vercel (bypasses Render SMTP firewall)
                urllib.request.urlopen(req, data=data, timeout=10)
                sent_count += 1
            except Exception as e:
                if not self.fail_silently:
                    raise e
                print(f"Vercel Email Relay failed: {e}")
                
        return sent_count
