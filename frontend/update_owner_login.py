import os
import re

filepath = 'src/owner/pages/Login.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'lucide-react' not in content:
    content = content.replace("import api from '../../services/api';", "import api from '../../services/api';\nimport { Eye, EyeOff } from 'lucide-react';")

# Add state
if 'showPassword' not in content:
    content = content.replace("const [submitting, setSubmitting] = useState(false);", "const [submitting, setSubmitting] = useState(false);\n const [showPassword, setShowPassword] = useState(false);")

# Update password input
old_input = '''<input 
 required 
 type="password" 
 value={form.password} 
 onChange={(e) => setForm({ ...form, password: e.target.value })} 
 className="w-full rounded-xl border border-gray-200 p-3.5 text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all" 
 placeholder="••••••••" 
 />'''

new_input = '''<div className="relative w-full">
<input 
 required 
 type={showPassword ? "text" : "password"} 
 value={form.password} 
 onChange={(e) => setForm({ ...form, password: e.target.value })} 
 className="w-full rounded-xl border border-gray-200 p-3.5 pr-10 text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all" 
 placeholder="••••••••" 
 />
 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
 {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
 </button>
 </div>'''

content = content.replace(old_input, new_input)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
