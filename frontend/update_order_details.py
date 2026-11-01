import os
import re

filepath = 'src/owner/pages/OrderDetails.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_info = """<div>
 <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Pickup Time</h3>
 <p className="font-bold text-slate-900">{order.pickup_time || 'As soon as possible'}</p>
 </div>"""

new_info = """<div>
 <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{order.order_type === 'DELIVERY' ? 'Delivery Time' : 'Pickup Time'}</h3>
 <p className="font-bold text-slate-900">{order.pickup_time || 'As soon as possible'}</p>
 </div>
 {order.order_type === 'DELIVERY' && (
 <div className="col-span-1 md:col-span-2 mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
 <h3 className="text-xs font-extrabold text-indigo-800 uppercase tracking-widest mb-1.5 flex items-center gap-1">
   <Package size={14} /> Delivery Address
 </h3>
 <p className="font-bold text-indigo-900 whitespace-pre-line text-sm">{order.delivery_address}</p>
 {order.delivery_pincode && <p className="text-xs text-indigo-700 mt-1 font-semibold">Pincode: {order.delivery_pincode}</p>}
 </div>
 )}"""

content = content.replace(old_info, new_info)

# Add Delivery Fee to Bill Summary
old_bill = """{parseFloat(order.packaging_fee) > 0 && (
 <div className="flex justify-between text-sm font-medium mb-3">
 <span className="text-slate-500">Packaging Fee</span>"""

new_bill = """{parseFloat(order.packaging_fee) > 0 && (
 <div className="flex justify-between text-sm font-medium mb-3">
 <span className="text-slate-500">Packaging Fee</span>
 <span className="text-slate-900">₹{order.packaging_fee}</span>
 </div>
 )}
 {parseFloat(order.delivery_fee) > 0 && (
 <div className="flex justify-between text-sm font-medium mb-3">
 <span className="text-slate-500">Delivery Fee</span>
 <span className="text-slate-900">₹{order.delivery_fee}</span>
 </div>
 )}
 {parseFloat(order.packaging_fee) > 0 && ( // HACK: to make regex work, I injected delivery fee before packaging fee
 <div className="flex justify-between text-sm font-medium mb-3 hidden">
 <span className="text-slate-500">Packaging Fee</span>"""

# A cleaner regex replace for bill:
content = re.sub(
    r'(\{parseFloat\(order\.packaging_fee\) > 0 && \(\s*<div className="flex justify-between text-sm font-medium mb-3">\s*<span className="text-slate-500">Packaging Fee</span>)',
    r'{parseFloat(order.delivery_fee) > 0 && (\n <div className="flex justify-between text-sm font-medium mb-3">\n <span className="text-slate-500">Delivery Fee</span>\n <span className="text-slate-900">₹{order.delivery_fee}</span>\n </div>\n )}\n \1',
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
