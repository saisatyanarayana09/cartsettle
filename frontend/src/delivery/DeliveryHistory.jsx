import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, MapPin, IndianRupee, Clock, Package, 
  Search, Truck, Calendar, ArrowUpRight 
} from 'lucide-react';
import api from '../services/api';

export default function DeliveryHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/delivery/history/')
      .then(res => setOrders(res.data || []))
      .catch(err => console.error('Error loading history:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return orders.filter(o => 
      o.id?.toString().toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.delivery_address && o.delivery_address.toLowerCase().includes(search.toLowerCase()))
    );
  }, [orders, search]);

  const totalEarnings = useMemo(() => {
    return orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  }, [orders]);

  // Group by date
  const groupedOrders = useMemo(() => {
    const groups = {};
    filtered.forEach(order => {
      const rawDate = order.delivered_at || order.updated_at || order.created_at;
      const d = rawDate ? new Date(rawDate) : new Date();
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      if (d.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (d.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    });
    return groups;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="size-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Loading trip history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Trip History & Fulfillment</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Your record of successfully fulfilled grocery deliveries</p>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex items-center gap-4">
          <div className="size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Truck size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed Trips</p>
            <p className="text-2xl font-black text-white">{orders.length}</p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex items-center gap-4">
          <div className="size-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Items Handed Over</p>
            <p className="text-2xl font-black text-white">
              {orders.reduce((sum, o) => sum + (o.items?.length || 1), 0)}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex items-center gap-4">
          <div className="size-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <IndianRupee size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Fulfilled Value</p>
            <p className="text-2xl font-black text-white">₹{totalEarnings.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      {orders.length > 0 && (
        <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-3 rounded-2xl border border-slate-800 shadow-sm focus-within:border-emerald-500/60 transition-colors">
          <Search size={16} className="text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trips by Order #, Customer, or Address..."
            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Orders List grouped by Date */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-6 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center">
          <div className="size-16 rounded-3xl bg-slate-800/80 text-slate-400 flex items-center justify-center mb-3.5">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-base font-bold text-slate-200">No trips found</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {search ? 'No completed trips match your search term.' : 'Completed trips and fulfilled customer orders will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedOrders).map(([dateLabel, groupOrders]) => (
            <div key={dateLabel} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Calendar size={14} className="text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {dateLabel} • {groupOrders.length} {groupOrders.length === 1 ? 'trip' : 'trips'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {groupOrders.map(order => {
                  const isCod = order.payment_method === 'COD';
                  return (
                    <div 
                      key={order.id} 
                      className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-white">#{order.id}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold">
                            Fulfilled
                          </span>
                        </div>

                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                          isCod 
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isCod ? `COD: ₹${order.total_amount}` : `Online: ₹${order.total_amount}`}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-200 text-sm">{order.customer_name || 'Customer'}</p>
                        <div className="flex items-start gap-1.5 text-slate-400">
                          <MapPin size={13} className="text-rose-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">{order.delivery_address || 'Address'}</span>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-500" />
                          <span>
                            {order.delivered_at 
                              ? new Date(order.delivered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              : new Date(order.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <span className="text-slate-500 font-medium">
                          {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

