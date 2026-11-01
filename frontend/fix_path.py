import os
import re

filepath = 'src/profile/pages/DashboardHome.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("path: '/profile'", "path: '/profile/account'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
