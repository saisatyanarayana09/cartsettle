import React from 'react';
import { X, ShoppingBag, PackageSearch } from 'lucide-react';
import { Link } from 'react-router-dom';

const ActiveOrdersModal = ({ isOpen, onClose, orders, handleQuickAction, getStatusBadge }) => {
  if (!isOpen) return null;

  const activeOrders = orders.filter(o => ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800 animate-slide-up"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">Active Orders</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage orders currently in progress.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar bg-slate-50/30 dark:bg-[#090d16]">
          {activeOrders.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <PackageSearch className="text-slate-400" size={32} />
              </div>
              <p className="text-base font-medium text-slate-900 dark:text-white">No active orders right now.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">When new orders arrive, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {order.id}
                      </span>
                      {getStatusBadge(order.status)}
                      {order.payment_method === 'UPI' && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full uppercase tracking-wider">UPI</span>
                      )}
                    </div>
                    
                    <Link to={`/owner/orders/${order.id}`} onClick={onClose} className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-sm">
                      {order.customer_name || 'Guest User'}
                    </Link>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      <span>{order.items_count} items</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      <span>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">₹{order.total_amount}</span>
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t border-slate-100 md:border-none mt-2 md:mt-0">
                    {order.status === 'NEW' && (
                      <>
                        <button 
                          onClick={(e) => handleQuickAction(e, order.id, 'ACCEPTED')}
                          className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={(e) => handleQuickAction(e, order.id, 'REJECTED')}
                          className="flex-1 md:flex-none px-4 py-2 bg-white dark:bg-slate-800 text-rose-600 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors shadow-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <button 
                        onClick={(e) => handleQuickAction(e, order.id, 'PREPARING')}
                        className="w-full md:w-auto px-6 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg transition-colors shadow-sm"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'PREPARING' && (
                      <button 
                        onClick={(e) => handleQuickAction(e, order.id, 'READY')}
                        className="w-full md:w-auto px-6 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg transition-colors shadow-sm"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'READY' && order.order_type !== 'PICKUP' && (
                      <button 
                        onClick={(e) => handleQuickAction(e, order.id, 'OUT_FOR_DELIVERY')}
                        className="w-full md:w-auto px-6 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg transition-colors shadow-sm"
                      >
                        Out for Delivery
                      </button>
                    )}
                    {order.status === 'READY' && order.order_type === 'PICKUP' && (
                      <button 
                        onClick={(e) => handleQuickAction(e, order.id, 'COMPLETED')}
                        className="w-full md:w-auto px-6 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg transition-colors shadow-sm"
                      >
                        Picked Up
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveOrdersModal;
