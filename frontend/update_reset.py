import os
import re

filepath = 'src/ResetPassword.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'Eye' not in content:
    content = content.replace("import { Lock } from 'lucide-react';", "import { Lock, Eye, EyeOff } from 'lucide-react';")

# Add state
if 'showPassword' not in content:
    content = content.replace("const [confirmPassword, setConfirmPassword] = useState('');", "const [confirmPassword, setConfirmPassword] = useState('');\n  const [showPassword, setShowPassword] = useState(false);\n  const [showConfirmPassword, setShowConfirmPassword] = useState(false);")

# Replace first password input
old_input1 = '''<input 
                  required 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3.5 pl-10 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="••••••••"
                />'''

new_input1 = '''<div className="relative w-full">
                <input 
                  required 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3.5 pl-10 pr-10 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                </div>'''
content = content.replace(old_input1, new_input1)

# Replace second password input
old_input2 = '''<input 
                  required 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3.5 pl-10 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="••••••••"
                />'''

new_input2 = '''<div className="relative w-full">
                <input 
                  required 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3.5 pl-10 pr-10 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                </div>'''
content = content.replace(old_input2, new_input2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
