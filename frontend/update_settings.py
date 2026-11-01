import os
import re

filepath = 'src/profile/pages/AccountSettings.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'Eye' not in content:
    content = content.replace("import { ChevronRight } from 'lucide-react';", "import { ChevronRight, Eye, EyeOff } from 'lucide-react';")

# Add state
if 'showPassword' not in content:
    content = content.replace("const [deletePassword, setDeletePassword] = useState('');", "const [deletePassword, setDeletePassword] = useState('');\n  const [showPassword, setShowPassword] = useState(false);\n  const [showDeletePassword, setShowDeletePassword] = useState(false);")

# Update new password input
old_input1 = '''<input type="password" placeholder="Leave blank to keep current password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"/>'''

new_input1 = '''<div className="relative w-full">
<input type={showPassword ? "text" : "password"} placeholder="Leave blank to keep current password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white p-3.5 pr-10 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"/>
<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
</button>
</div>'''
content = content.replace(old_input1, new_input1)

# Update delete password input
old_input2 = '''<input 
                type="password" 
                value={deletePassword} 
                onChange={e => setDeletePassword(e.target.value)} 
                placeholder="Your password" 
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />'''

new_input2 = '''<div className="relative w-full">
              <input 
                type={showDeletePassword ? "text" : "password"} 
                value={deletePassword} 
                onChange={e => setDeletePassword(e.target.value)} 
                placeholder="Your password" 
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 pr-10 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
              <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                {showDeletePassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              </div>'''
content = content.replace(old_input2, new_input2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
