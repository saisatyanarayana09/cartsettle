import os
import re

filepath = 'src/owner/pages/Customers.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We want to move `{/* Customer Detail Modal */}` BEFORE the final `</div>`
# The easiest way is to find the exact structure at the end.

pattern = r", document\.body\)}\s*</div>\s*\{/\* Customer Detail Modal \*/\}"
replacement = r", document.body)}\n   {/* Customer Detail Modal */}"

content = re.sub(pattern, replacement, content)

pattern2 = r"     document\.body\s*\)\}\s*\}\s*\)\s*;\s*\}\s*;\s*export default Customers;"
replacement2 = r"     document.body\n   )}\n   </div>\n );\n};\n\nexport default Customers;"

content = re.sub(pattern2, replacement2, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
