import os

filepath = 'src/owner/pages/Settings.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Waive fee if order > this amount.", "Waive fee if order &gt; this amount.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
