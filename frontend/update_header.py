import os
import re

filepath = 'src/owner/pages/Customers.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<div className="flex justify-between items-center">\s*<div>\s*<h1 className="text-2xl font-bold text-gray-900">Customer Directory</h1>\s*<p className="text-sm text-gray-500 mt-1">View and manage registered customers</p>\s*</div>\s*<button onClick=\{fetchCustomers\} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium shadow-sm transition">\s*Refresh\s*</button>\s*</div>'

new_header = """<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
   <div>
   <h1 className="text-2xl font-bold text-gray-900">Customer Directory</h1>
   <p className="text-sm text-gray-500 mt-1">View and manage registered customers</p>
   </div>
   <div className="flex items-center gap-3">
     <div className="bg-slate-100 p-1 rounded-xl inline-flex">
       <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Active</button>
       <button onClick={() => setActiveTab('deleted')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'deleted' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-red-500'}`}>Deleted Accounts</button>
     </div>
     <button onClick={fetchCustomers} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium shadow-sm transition">
     Refresh
     </button>
   </div>
   </div>"""

content = re.sub(pattern, new_header, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
