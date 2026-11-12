import React from 'react';
import { X, ShoppingBag, PackageSearch } from 'lucide-react';
import { Link } from '../../router';

const ActiveOrdersModal = ({ isOpen, onClose, orders, handleQuickAction, getStatusBadge }) => {
  if (!isOpen) return null;

  const activeOrders = orders.filter(o => ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status));

  return (
    <div className="owner-theme fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-[#351D28] rounded-2xl shadow-xl flex flex-col max-h-[85vh] border border-[#E7DBCF] dark:border-white/10 animate-slide-up text-[#2D1822] dark:text-[#FAF5EF] overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#E7DBCF] dark:border-white/10 flex items-center justify-between bg-[#FAF5EF] dark:bg-[#2D1822] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#EFDFD2] dark:bg-[#432634] text-[#56323E] dark:text-[#FAF5EF] rounded-lg">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#2D1822] dark:text-white tracking-tight">Active Orders</h2>
              <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA]">Manage orders currently in progress.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-[#A68B98] hover:text-[#5E4752] dark:hover:text-[#C5B0BA] hover:bg-[#F2E9E0] dark:hover:bg-[#3F2231] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar bg-[#F9F6EF] dark:bg-[#2D1822]">
          {activeOrders.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#F2E9E0] dark:bg-[#3F2231] flex items-center justify-center mb-4">
                <PackageSearch className="text-[#A68B98]" size={32} />
              </div>
              <p className="text-base font-medium text-[#2D1822] dark:text-white">No active orders right now.</p>
              <p className="text-sm text-[#7D6671] dark:text-[#C5B0BA] mt-1">When new orders arrive, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-[#351D28] p-4 rounded-xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono font-medium text-[#7D6671] bg-[#F2E9E0] dark:bg-[#3F2231] px-2 py-0.5 rounded border border-[#E7DBCF] dark:border-white/[0.08]">
                        {order.id}
                      </span>
                      {getStatusBadge(order.status)}
                      {(order.payment_method === 'PAYPAL' || order.paypal_authorization_id || order.payment_method === 'UPI') && (
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold rounded-full uppercase tracking-wider">PayPal</span>
                      )}
                    </div>
                    
                    <Link to={`/owner/orders/${order.id}`} onClick={onClose} className="font-semibold text-[#2D1822] dark:text-white hover:text-[#56323E] dark:hover:text-[#EFDFD2] text-sm">
                      {order.customer_name || 'Guest User'}
                    </Link>
                    
                    <div className="flex items-center gap-3 text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1.5">
                      <span>{order.items_count} items</span>
                      <span className="w-1 h-1 rounded-full bg-[#D9C6B8] dark:bg-[#432634]"></span>
                      <span>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="w-1 h-1 rounded-full bg-[#D9C6B8] dark:bg-[#432634]"></span>
                      <span className="font-medium text-[#5E4752] dark:text-[#C5B0BA] text-sm">₹{order.total_amount}</span>
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t border-[#E7DBCF] md:border-none mt-2 md:mt-0">
                    {order.status === 'NEW' && (
                      <>
                        <button 
                          onClick={(e) => handleQuickAction(e, order.id, 'ACCEPTED')}
                          className="flex-1 md:flex-none px-4 py-2 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:text-[#2D1822] text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={(e) => handleQuickAction(e, order.id, 'REJECTED')}
                          className="flex-1 md:flex-none px-4 py-2 bg-white dark:bg-[#3F2231] text-[#5E4752] dark:text-[#C5B0BA] border border-[#E7DBCF] dark:border-white/[0.08] hover:bg-[#FAF5EF] dark:hover:bg-[#432634] rounded-lg text-xs font-medium transition-colors shadow-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <button 
                        onClick={(e) => handleQuickAction(e, order.id, 'PREPARING')}
                        className="w-full md:w-auto px-6 py-2 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:hover:bg-[#E7DBCF] dark:text-[#2D1822] text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'PREPARING' && (
                      <button 
                        onClick={(e) => handleQuickAction(e, order.id, 'READY')}
                        className="w-full md:w-auto px-6 py-2 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:hover:bg-[#E7DBCF] dark:text-[#2D1822] text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'READY' && order.order_type !== 'PICKUP' && (
                      <button 
                        onClick={(e) => handleQuickAction(e, order.id, 'OUT_FOR_DELIVERY')}
                        className="w-full md:w-auto px-6 py-2 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:hover:bg-[#E7DBCF] dark:text-[#2D1822] text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        Out for Delivery
                      </button>
                    )}
                    {order.status === 'READY' && order.order_type === 'PICKUP' && (
                      <button 
                        onClick={(e) => handleQuickAction(e, order.id, 'COMPLETED')}
                        className="w-full md:w-auto px-6 py-2 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:hover:bg-[#E7DBCF] dark:text-[#2D1822] text-xs font-bold rounded-lg transition-colors shadow-sm"
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
