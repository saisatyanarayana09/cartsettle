import os
import re

filepath = 'src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State hooks injection
old_hooks = """export function CheckoutPage() {
 const navigate = useNavigate(); const { cart, isCustomer, refresh, storeSettings } = useCart(); const [time, setTime] = useState('As soon as possible'); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
 const [walletBalance, setWalletBalance] = useState(0); const [useWallet, setUseWallet] = useState(false);"""

new_hooks = """export function CheckoutPage() {
 const navigate = useNavigate(); const { cart, isCustomer, refresh, storeSettings } = useCart(); const [time, setTime] = useState('As soon as possible'); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
 const [walletBalance, setWalletBalance] = useState(0); const [useWallet, setUseWallet] = useState(false);
 const [orderType, setOrderType] = useState('PICKUP');
 const [deliveryAddress, setDeliveryAddress] = useState('');
 const [deliveryPincode, setDeliveryPincode] = useState('');"""

content = content.replace(old_hooks, new_hooks)

# 2. Submit payload modification
old_submit = """ async function submit() { setLoading(true); setError(''); try { const response = await api.post('/orders/', { pickup_time: time, customer_note: note, use_wallet: useWallet }); await refresh(); navigate(`/orders/${response.data.id}`) } catch (requestError) { setError(requestError.response?.data?.detail || 'Could not place your order.') } finally { setLoading(false) } }"""

new_submit = """ async function submit() { 
  setLoading(true); setError(''); 
  try { 
    const response = await api.post('/orders/', { 
      pickup_time: time, 
      customer_note: note, 
      use_wallet: useWallet,
      order_type: orderType,
      delivery_address: deliveryAddress,
      delivery_pincode: deliveryPincode
    }); 
    await refresh(); 
    navigate(`/orders/${response.data.id}`) 
  } catch (requestError) { 
    setError(requestError.response?.data?.detail || 'Could not place your order.') 
  } finally { 
    setLoading(false) 
  } 
 }"""

content = content.replace(old_submit, new_submit)

# 3. Delivery Fee frontend math
old_math = """ const cartTotal = parseFloat(cart?.total || 0);
 const finalTotal = useWallet ? Math.max(0, cartTotal - walletBalance) : cartTotal;
 const walletApplied = useWallet ? Math.min(cartTotal, walletBalance) : 0;"""

new_math = """ const cartSubtotal = parseFloat(cart?.subtotal || 0);
 let deliveryFee = 0;
 if (orderType === 'DELIVERY' && storeSettings?.is_home_delivery_active) {
   if (parseFloat(storeSettings.free_delivery_threshold) > 0 && cartSubtotal >= parseFloat(storeSettings.free_delivery_threshold)) {
     deliveryFee = 0;
   } else {
     deliveryFee = parseFloat(storeSettings.delivery_fee || 0);
   }
 }
 const cartTotal = parseFloat(cart?.total || 0) + deliveryFee;
 const finalTotal = useWallet ? Math.max(0, cartTotal - walletBalance) : cartTotal;
 const walletApplied = useWallet ? Math.min(cartTotal, walletBalance) : 0;"""

content = content.replace(old_math, new_math)

# 4. Form inputs (Toggle and Address)
old_form = """<div className="mt-5 rounded-xl bg-white p-5 shadow-sm"><label className="text-sm font-bold">Pickup preference<select value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"><option>As soon as possible</option><option>In 30 minutes</option><option>In 1 hour</option></select></label><label className="mt-4 block text-sm font-bold">Note for the store (optional)<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="E.g., Please pack fragile items carefully..." className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none h-24" /></label>"""

new_form = """<div className="mt-5 rounded-xl bg-white p-5 shadow-sm">
  
  <div className="mb-6">
    <label className="text-sm font-bold block mb-2">Order Type</label>
    <div className="flex bg-slate-100 p-1 rounded-xl">
      <button onClick={() => setOrderType('PICKUP')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${orderType === 'PICKUP' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>🏪 Store Pickup</button>
      <button 
        onClick={() => storeSettings?.is_home_delivery_active ? setOrderType('DELIVERY') : null} 
        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${orderType === 'DELIVERY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'} ${!storeSettings?.is_home_delivery_active ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-700'}`}
      >
        🛵 Home Delivery {!storeSettings?.is_home_delivery_active && '(Unavailable)'}
      </button>
    </div>
  </div>

  {orderType === 'PICKUP' ? (
    <label className="text-sm font-bold block">Pickup time<select value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"><option>As soon as possible</option><option>In 30 minutes</option><option>In 1 hour</option></select></label>
  ) : (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
      <label className="text-sm font-bold block">Delivery Address<textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="House/Flat No, Street, Landmark..." className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-20" required></textarea></label>
      <label className="text-sm font-bold block">Pincode<input type="text" value={deliveryPincode} onChange={(e) => setDeliveryPincode(e.target.value)} placeholder="e.g. 530001" className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" required/></label>
      
      {parseFloat(storeSettings?.min_delivery_order_amount) > 0 && parseFloat(cart?.subtotal) < parseFloat(storeSettings.min_delivery_order_amount) && (
        <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-lg border border-red-100">
          Home Delivery requires a minimum cart total of ₹{storeSettings.min_delivery_order_amount}.
        </div>
      )}
    </div>
  )}
  <label className="mt-4 block text-sm font-bold">Note for the store (optional)<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="E.g., Please pack fragile items carefully..." className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none h-16" /></label>"""

content = content.replace(old_form, new_form)

# 5. Bill breakdown delivery fee injection
old_breakdown = """{cart?.packaging_fee > 0 && <div className="flex justify-between"><span>Packaging Fee</span><span>₹{cart.packaging_fee}</span></div>}"""

new_breakdown = """{cart?.packaging_fee > 0 && <div className="flex justify-between"><span>Packaging Fee</span><span>₹{cart.packaging_fee}</span></div>}
   {orderType === 'DELIVERY' && <div className="flex justify-between"><span>Delivery Fee</span><span className={deliveryFee === 0 ? 'text-green-600 font-bold' : ''}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>}"""

content = content.replace(old_breakdown, new_breakdown)


# 6. Minimum Order lock (Pickup vs Delivery)
old_min_order = """   ) : Number(storeSettings?.min_order_amount) > 0 && Number(cart.subtotal) < Number(storeSettings.min_order_amount) ? (
   <div className="mt-5 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-700 border border-amber-100">Minimum order amount is ₹{storeSettings.min_order_amount}</div>
   ) : ("""

new_min_order = """   ) : Number(storeSettings?.min_order_amount) > 0 && Number(cart.subtotal) < Number(storeSettings.min_order_amount) ? (
   <div className="mt-5 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-700 border border-amber-100">Minimum order amount is ₹{storeSettings.min_order_amount}</div>
   ) : orderType === 'DELIVERY' && Number(storeSettings?.min_delivery_order_amount) > 0 && Number(cart.subtotal) < Number(storeSettings.min_delivery_order_amount) ? (
   <div className="mt-5 rounded-xl bg-red-50 p-4 text-center font-bold text-red-700 border border-red-100">Home Delivery requires a minimum cart total of ₹{storeSettings.min_delivery_order_amount}</div>
   ) : ("""

content = content.replace(old_min_order, new_min_order)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
