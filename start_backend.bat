@echo off
title CartSettle Django Backend (Port 8000)
cd /d S:\Hackathon\cartsettle\backend
echo Starting CartSettle Django Backend on http://127.0.0.1:8000 ...
python manage.py runserver 127.0.0.1:8000
pause
