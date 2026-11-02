import os, re, sys, django, requests
sys.stdout.reconfigure(encoding='utf-8')

# Configure Django
sys.path.append(r"S:\Hackathon\cartsettle\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
owner = User.objects.filter(is_owner=True).first()
if not owner:
    owner = User.objects.filter(is_staff=True).first()

refresh = RefreshToken.for_user(owner)
token = str(refresh.access_token)
headers = {
    'Authorization': f'Bearer {token}',
    'X-Portal-Context': 'owner'
}

endpoints = set()
for root, dirs, files in os.walk(r"S:\Hackathon\cartsettle\frontend\src"):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                for line in fp:
                    matches = re.findall(r'api\.get\([`\'"]([^`\'"?$]+)', line)
                    for m in matches:
                        if m.startswith('/'):
                            endpoints.add((m, f))

print(f"Discovered {len(endpoints)} unique GET endpoints in frontend:")
for ep, f in sorted(endpoints):
    url = f"http://127.0.0.1:8000/api/v1{ep}"
    try:
        res = requests.get(url, headers=headers, timeout=3)
        status = res.status_code
        detail = ""
        if status >= 400:
            detail = res.text[:80]
        print(f"[{status}] {ep} (from {f}) {detail}")
    except Exception as e:
        print(f"[ERR] {ep} -> {e}")
