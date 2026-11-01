import os
import re

filepath = 'src/owner/pages/Customers.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states for modal
if 'const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);' not in content:
    content = content.replace(
        "const [notifSending, setNotifSending] = useState(false);", 
        "const [notifSending, setNotifSending] = useState(false);\n const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);\n const [detailsLoading, setDetailsLoading] = useState(false);"
    )

# Add fetch details function
fetch_func = '''
 const fetchCustomerDetails = async (id) => {
   try {
     setDetailsLoading(true);
     const { data } = await api.get(`/auth/customers/${id}/details/`);
     setSelectedCustomerDetail(data);
   } catch (err) {
     alert("Failed to load customer details.");
   } finally {
     setDetailsLoading(false);
   }
 };
'''
if 'const fetchCustomerDetails' not in content:
    content = content.replace("const fetchCustomers = async () => {", fetch_func + "\n const fetchCustomers = async () => {")


# Update table row to be clickable
old_tr = '<tr key={customer.id} className="hover:bg-slate-50 transition-colors group">'
new_tr = '<tr key={customer.id} onClick={(e) => { if(e.target.closest("button")) return; fetchCustomerDetails(customer.id); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">'
content = content.replace(old_tr, new_tr)

# Add Modal UI at the end
modal_ui = '''
   {/* Customer Detail Modal */}
   {selectedCustomerDetail && createPortal(
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
         {/* Header */}
         <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
             <UserIcon className="text-slate-400" size={20} />
             Customer Profile
           </h2>
           <button onClick={() => setSelectedCustomerDetail(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
             <X size={20} />
           </button>
         </div>
         
         {/* Body */}
         <div className="p-6 overflow-y-auto">
           {detailsLoading ? (
             <div className="py-12 text-center text-slate-500 font-medium">Loading details...</div>
           ) : (
             <div className="space-y-6">
               {/* Quick Stats Grid */}
               <div className="grid grid-cols-3 gap-4">
                 <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                   <div className="text-sm font-bold text-indigo-900 mb-1">Lifetime Sales</div>
                   <div className="text-2xl font-extrabold text-indigo-700">₹{selectedCustomerDetail.total_spent?.toFixed(2) || '0.00'}</div>
                 </div>
                 <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                   <div className="text-sm font-bold text-emerald-900 mb-1">Total Orders</div>
                   <div className="text-2xl font-extrabold text-emerald-700">{selectedCustomerDetail.total_orders || 0}</div>
                 </div>
                 <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                   <div className="text-sm font-bold text-amber-900 mb-1">Wallet Balance</div>
                   <div className="text-2xl font-extrabold text-amber-700">₹{selectedCustomerDetail.wallet_balance?.toFixed(2) || '0.00'}</div>
                 </div>
               </div>
               
               {/* Contact Info */}
               <div>
                 <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Contact Information</h3>
                 <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Name</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.first_name || 'Unknown'} {selectedCustomerDetail.last_name}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Email</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.email || selectedCustomerDetail.username}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Mobile</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.customer_profile?.mobile_number || 'N/A'}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Date of Birth</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.customer_profile?.dob || 'N/A'}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Referral Code</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.customer_profile?.referral_code || 'N/A'}</span>
                   </div>
                 </div>
               </div>
               
               {/* Recent Orders */}
               <div>
                 <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Recent Orders</h3>
                 {selectedCustomerDetail.recent_orders?.length > 0 ? (
                   <div className="border border-slate-100 rounded-xl overflow-hidden">
                     <table className="min-w-full divide-y divide-slate-100">
                       <thead className="bg-slate-50">
                         <tr>
                           <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Order ID</th>
                           <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                           <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Amount</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50 bg-white">
                         {selectedCustomerDetail.recent_orders.map(order => (
                           <tr key={order.id}>
                             <td className="px-4 py-3 text-sm font-bold text-indigo-600">{order.id}</td>
                             <td className="px-4 py-3 text-sm font-medium text-slate-600">{order.status}</td>
                             <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">₹{order.total_amount?.toFixed(2)}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 ) : (
                   <div className="p-4 bg-slate-50 rounded-xl text-center text-sm font-medium text-slate-500 border border-slate-100">
                     No orders found for this customer.
                   </div>
                 )}
               </div>
             </div>
           )}
         </div>
       </div>
     </div>,
     document.body
   )}
'''

if '{selectedCustomerDetail && createPortal(' not in content:
    content = content.replace("</div>\n );\n}", "</div>\n" + modal_ui + "\n );\n}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
