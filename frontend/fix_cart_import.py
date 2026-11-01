import os
import re

filepath = 'src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Eye and EyeOff
content = re.sub(
    r"from 'lucide-react'", 
    r", Eye, EyeOff } from 'lucide-react'", 
    content
)
# Cleanup if it created double curly braces
content = re.sub(r"\}\s*,\s*Eye,\s*EyeOff\s*\}", r", Eye, EyeOff }", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
