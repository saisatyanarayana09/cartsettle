import os
import re

filepath = 'src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Update imports
content = content.replace(
    "import { Minus, Plus, Trash2, ShoppingBasket, ArrowLeft , Eye, EyeOff } from 'lucide-react'",
    "import { Minus, Plus, Trash2, ShoppingBasket, ArrowLeft, Eye, EyeOff, CheckCircle2, PackageSearch, Truck, Store, XCircle } from 'lucide-react'"
)

# Replace OrderDetailPage entirely
old_detail_start = "export function OrderDetailPage() {"
old_detail_end = "}</main></CustomerLayout>\n}"
# The file ends at `}</main></CustomerLayout>\n}`

new_detail = """export function OrderDetailPage() {
 const { id } = useParams(); const navigate = useNavigate(); const [order, setOrder] = useState(null); const [error, setError] = useState('')
 
 useEffect(() => {
  const fetchOrder = () => api.get(`/orders/${id}/`, { params: { t: Date.now() } }).then((response) => setOrder(response.data)).catch(() => setError('Could not load this order.'));
  fetchOrder();
  const intervalId = setInterval(fetchOrder, 5000); return () => clearInterval(intervalId); 
 }, [id]); 
 
 const getSteps = (type) => [
   { id: 'NEW', label: 'Order Placed', desc: 'We received your order', icon: CheckCircle2 },
   { id: 'ACCEPTED', label: 'Processing', desc: 'Store is packing your items', icon: PackageSearch },
   { id: 'READY', label: type === 'DELIVERY' ? 'Out for Delivery' : 'Ready for Pickup', desc: type === 'DELIVERY' ? 'Your order is on the way!' : 'Waiting for you at the store', icon: type === 'DELIVERY' ? Truck : Store },
   { id: 'COMPLETED', label: type === 'DELIVERY' ? 'Delivered' : 'Completed', desc: type === 'DELIVERY' ? 'Order delivered successfully' : 'Order picked up successfully', icon: CheckCircle2 }
 ];
 
 const statusIndex = ['NEW', 'ACCEPTED', 'READY', 'COMPLETED'];

 return (
  <CustomerLayout>
    <main className="mx-auto max-w-xl px-4 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-none cursor-pointer p-0">
        <ArrowLeft size={16} /> Back
      </button>
      
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {!order && !error && <p className="text-slate-500">Loading order...</p>}
      
      {order && (
        <>
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <p className="text-sm font-bold text-primary-700">Order confirmed</p>
              <h1 className="mt-1 text-3xl font-extrabold">{order.id}</h1>
            </div>
            {order.status === 'COMPLETED' && (
              <Link to={`/orders/${order.id}/invoice`} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition block text-center shadow-sm">
                View Invoice
              </Link>
            )}
          </div>

          {/* Tracking Timeline UI */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Track Order</h2>
            {order.status === 'REJECTED' ? (
              <div className="flex items-center gap-4 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100">
                <XCircle className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Order Cancelled</h3>
                  <p className="text-sm opacity-90">This order was cancelled and any wallet balance has been refunded.</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-100"></div>
                
                <div className="space-y-6 relative">
                  {getSteps(order.order_type).map((step, index) => {
                    const currentIndex = statusIndex.indexOf(order.status);
                    const isCompleted = currentIndex >= index;
                    const isActive = currentIndex === index;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className={`flex gap-4 items-start ${!isCompleted ? 'opacity-40' : ''}`}>
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-500 ${isCompleted ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'} ${isActive ? 'ring-4 ring-primary-100' : ''}`}>
                          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <div className="pt-2 flex-1">
                          <h4 className={`text-sm font-bold ${isActive ? 'text-primary-700' : 'text-slate-900'}`}>{step.label}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {order.customer_note && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-extrabold uppercase text-slate-500 mb-1">Your Note</p>
              <p className="text-sm text-slate-800">{order.customer_note}</p>
            </div>
          )}
          {order.owner_note && (
            <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-xl">
              <p className="text-xs font-extrabold uppercase text-primary-600 mb-1">Store Reply</p>
              <p className="text-sm text-primary-900">{order.owner_note}</p>
            </div>
          )}

          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-3">Order Items</h2>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                  {item.quantity} x {item.product_name_snapshot} 
                  {item.status === 'REJECTED' && <span className="ml-2 text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">Unavailable</span>}
                </span>
                <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 font-bold'}>₹{item.subtotal}</span>
              </div>
            ))}
            
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Billing Summary</h2>
              <div className="space-y-2 text-sm text-slate-600 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-900">₹{order.items.reduce((sum, item) => sum + (item.status !== 'REJECTED' ? parseFloat(item.subtotal) : 0), 0).toFixed(2)}</span>
                </div>
                {parseFloat(order.discount_applied) > 0 && <div className="flex justify-between text-primary-700"><span>Product Savings</span><span>- ₹{order.discount_applied}</span></div>}
                {parseFloat(order.promo_discount) > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>Promo Discount</span><span>- ₹{order.promo_discount}</span></div>}
                {parseFloat(order.packaging_fee) > 0 && <div className="flex justify-between"><span>Packaging Fee</span><span className="text-slate-900">₹{order.packaging_fee}</span></div>}
                {parseFloat(order.delivery_fee) > 0 && <div className="flex justify-between"><span>Delivery Fee</span><span className="text-slate-900">₹{order.delivery_fee}</span></div>}
                {parseFloat(order.wallet_discount) > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>Wallet Applied</span><span>- ₹{order.wallet_discount}</span></div>}
              </div>
              <div className="flex justify-between font-extrabold text-lg pt-3 mt-3 border-t border-slate-100">
                <span className="text-slate-900">{order.status === 'COMPLETED' ? 'Total Amount Paid' : 'Total Due'}</span>
                <span className="text-primary-600">₹{order.total_amount}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600 text-center font-medium shadow-sm">
            {order.order_type === 'DELIVERY' ? (
              <>
                <Truck className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                Delivery to: <br/>
                <strong className="text-slate-800">{order.delivery_address}</strong>
                {order.delivery_pincode && <><br/>Pincode: {order.delivery_pincode}</>}
              </>
            ) : (
              <>
                <Store className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                Pickup: <strong className="text-slate-800">{order.pickup_time || 'As soon as possible'}</strong> <br/>
                Pay at store
              </>
            )}
          </div>
        </>
      )}
    </main>
  </CustomerLayout>
 );
}"""

content = re.sub(r'export function OrderDetailPage\(\) \{.*\}</main></CustomerLayout>\n\}', new_detail, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
