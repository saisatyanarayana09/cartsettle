import os
import re

filepath = 'src/owner/pages/Orders.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_badge = """   <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest rounded-md ${getStatusColor(order.status)}`}>
   {order.status}
   </span>
   </div>"""

new_badge = """   <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest rounded-md ${getStatusColor(order.status)}`}>
   {order.status}
   </span>
   {order.order_type === 'DELIVERY' && (
     <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest rounded-md bg-purple-100 text-purple-700">
       Home Delivery
     </span>
   )}
   </div>"""

content = content.replace(old_badge, new_badge)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
