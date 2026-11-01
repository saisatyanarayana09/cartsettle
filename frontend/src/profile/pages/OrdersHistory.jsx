import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import api, { getUserCacheSync, setUserCache } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

export default function OrdersHistory() {
  const cachedOrders = getUserCacheSync('/orders/');
  const [orders, setOrders] = useState(cachedOrders || []);
  const [loading, setLoading] = useState(!cachedOrders);

  const fetchOrders = useCallback((silent = false) => {
    if (!silent && !cachedOrders) setLoading(true);
    api.get('/orders/')
      .then(res => {
        const orderList = res.data.results || res.data || [];
        setOrders(orderList);
        setUserCache('/orders/', orderList);
      })
      .catch(() => {
        if (!cachedOrders) setOrders([]);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [cachedOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const activeOrder = orders.find(o =>
    ['PENDING', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(
      String(o?.status || '').toUpperCase()
    )
  );

  const handleWsMessage = useCallback((data) => {
    if (!data || !data.type) return;
    if (data.type === 'ORDER_STATUS_UPDATE') {
      fetchOrders(true);
    }
  }, [fetchOrders]);

  useWebSocket({
    path: activeOrder ? `/ws/orders/${activeOrder.id}/tracking/` : '',
    enabled: Boolean(activeOrder),
    onMessage: handleWsMessage,
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'REJECTED': return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'READY': return 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800';
      case 'PREPARING': return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default: return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Order History</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track and review your past purchases.</p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-50 dark:bg-slate-800/60 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-primary-50 dark:bg-primary-950/50 rounded-full flex items-center justify-center text-primary-400 dark:text-primary-300 mb-6 shadow-inner">
            <Package size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No orders yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">It looks like you haven't placed any orders yet. Once you make a purchase, it will appear here so you can track its status.</p>
          <Link to="/products" className="bg-primary-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-primary-700 hover:shadow-md active:scale-95 transition-all inline-flex items-center gap-2">
            Start Shopping <ChevronRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link key={order.id} to={`/orders/${order.id}`} className="group block bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-extrabold text-lg text-slate-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{order.id}</span>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}</p>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                  <p className="font-black text-xl text-slate-900 dark:text-white">₹{parseFloat(order.total_amount).toFixed(2)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
