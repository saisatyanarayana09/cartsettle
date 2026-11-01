import sys
import os
from pathlib import Path

def main():
    backend_path = str(Path(__file__).resolve().parent / 'backend')
    sys.path.insert(0, backend_path)
    root_path = str(Path(__file__).resolve().parent)
    if root_path in sys.path:
        sys.path.remove(root_path)
    if '' in sys.path:
        sys.path.remove('')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError("Couldn't import Django.") from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()

