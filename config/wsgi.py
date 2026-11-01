import sys
import os
from pathlib import Path
import importlib.util

backend_path = str(Path(__file__).resolve().parent.parent / 'backend')
sys.path.insert(0, backend_path)

root_path = str(Path(__file__).resolve().parent.parent)
if root_path in sys.path:
    sys.path.remove(root_path)
if '' in sys.path:
    sys.path.remove('')

if 'config' in sys.modules:
    del sys.modules['config']
if 'config.wsgi' in sys.modules:
    del sys.modules['config.wsgi']

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

