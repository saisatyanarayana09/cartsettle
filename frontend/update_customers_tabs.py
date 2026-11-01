import os
import re

filepath = 'src/owner/pages/Customers.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add activeTab state
if 'const [activeTab, setActiveTab] = useState(' not in content:
    content = content.replace(
        "const [detailsLoading, setDetailsLoading] = useState(false);",
        "const [detailsLoading, setDetailsLoading] = useState(false);\n const [activeTab, setActiveTab] = useState('active');\n const displayedCustomers = customers.filter(c => activeTab === 'active' ? c.is_active : !c.is_active);"
    )

# Add tabs UI
old_header = '''<div className="flex justify-between items-center">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Customer Directory</h1>
 <p className="text-sm text-gray-500 mt-1">View and manage registered customers</p>
 </div>
 <button onClick={fetchCustomers} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium shadow-sm transition">
 Refresh
 </button>
 </div>'''

new_header = '''<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
 </div>'''
content = content.replace(old_header, new_header)

# Use displayedCustomers in rendering
content = content.replace("customers.length === 0", "displayedCustomers.length === 0")
content = content.replace("customers.map((customer)", "displayedCustomers.map((customer)")

# Hide Action buttons if deleted, show "Account Deleted" badge
old_actions = '''<button onClick={() => setNotifyUser(customer)} className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2" title="Send Notification">
        <Bell size={16} /> Notify
      </button>
      {customer.customer_profile?.delete_requested && (
        <div className="flex items-center gap-1 bg-red-50 border border-red-100 p-1 rounded-xl">
          <span className="text-xs font-bold text-red-600 px-2 uppercase tracking-wide">Delete Requested</span>
          <button onClick={(e) => { e.stopPropagation(); approveDeletion(customer.id); }} className="text-white bg-red-600 hover:bg-red-700 p-1.5 rounded-lg transition-colors" title="Approve Deletion">
            <CheckCircle size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); rejectDeletion(customer.id); }} className="text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Reject Deletion">
            <XCircle size={16} />
          </button>
        </div>
      )}'''

new_actions = '''{!customer.is_active ? (
        <span className="bg-slate-100 text-slate-500 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200">Account Deleted</span>
      ) : (
        <>
          <button onClick={(e) => { e.stopPropagation(); setNotifyUser(customer); }} className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2" title="Send Notification">
            <Bell size={16} /> Notify
          </button>
          {customer.customer_profile?.delete_requested && (
            <div className="flex items-center gap-1 bg-red-50 border border-red-100 p-1 rounded-xl">
              <span className="text-xs font-bold text-red-600 px-2 uppercase tracking-wide">Delete Requested</span>
              <button onClick={(e) => { e.stopPropagation(); approveDeletion(customer.id); }} className="text-white bg-red-600 hover:bg-red-700 p-1.5 rounded-lg transition-colors" title="Approve Deletion">
                <CheckCircle size={16} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); rejectDeletion(customer.id); }} className="text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Reject Deletion">
                <XCircle size={16} />
              </button>
            </div>
          )}
        </>
      )}'''

# Since we had event.stopPropagation added in the regex but maybe it wasn't there in the old content, let's use a simpler replace
# Wait, let's just do a clean regex replacement for the action buttons
import re

content = re.sub(
    r'<button onClick=\{.*?setNotifyUser.*?<Bell size=\{16\} /> Notify\s*</button>\s*\{customer\.customer_profile\?\.delete_requested && \(\s*<div.*?</div>\s*\)\}',
    new_actions,
    content,
    flags=re.DOTALL
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
