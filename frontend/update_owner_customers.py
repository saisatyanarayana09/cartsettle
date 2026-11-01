import os
import re

filepath = 'src/owner/pages/Customers.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports for Trash2, CheckCircle, XCircle
if 'Trash2' not in content:
    content = content.replace("import { Users, User as UserIcon, Bell, X } from 'lucide-react';", "import { Users, User as UserIcon, Bell, X, Trash2, CheckCircle, XCircle } from 'lucide-react';")

# Add API functions for approving/rejecting
functions = '''
 const approveDeletion = async (userId) => {
   if(!window.confirm("Are you sure you want to PERMANENTLY delete this customer and all their data? This cannot be undone.")) return;
   try {
     await api.post(/auth/customers//approve-delete/);
     fetchCustomers();
   } catch(err) {
     alert("Failed to approve deletion.");
   }
 };

 const rejectDeletion = async (userId) => {
   if(!window.confirm("Are you sure you want to reject this deletion request?")) return;
   try {
     await api.post(/auth/customers//reject-delete/);
     fetchCustomers();
   } catch(err) {
     alert("Failed to reject deletion.");
   }
 };
'''

content = content.replace("const sendNotification = async (e) => {", functions + "\n const sendNotification = async (e) => {")

# Update table rendering
old_actions = '''   <td className="px-6 py-4 whitespace-nowrap text-right">
   <button onClick={() => setNotifyUser(customer)} className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2"title="Send Notification">
   <Bell size={16} /> Notify
   </button>
   </td>'''

new_actions = '''   <td className="px-6 py-4 whitespace-nowrap text-right">
    <div className="flex items-center justify-end gap-2">
      <button onClick={() => setNotifyUser(customer)} className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2" title="Send Notification">
        <Bell size={16} /> Notify
      </button>
      {customer.customer_profile?.delete_requested && (
        <div className="flex items-center gap-1 bg-red-50 border border-red-100 p-1 rounded-xl">
          <span className="text-xs font-bold text-red-600 px-2 uppercase tracking-wide">Delete Requested</span>
          <button onClick={() => approveDeletion(customer.id)} className="text-white bg-red-600 hover:bg-red-700 p-1.5 rounded-lg transition-colors" title="Approve Deletion">
            <CheckCircle size={16} />
          </button>
          <button onClick={() => rejectDeletion(customer.id)} className="text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Reject Deletion">
            <XCircle size={16} />
          </button>
        </div>
      )}
    </div>
   </td>'''

content = content.replace(old_actions, new_actions)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
