import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from '../../router';
import { createPortal } from 'react-dom';
import { Search, Printer, AlertTriangle, Loader2, Table, LayoutGrid, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import InvoiceModal from '../components/InvoiceModal';
import OwnerOrdersAgGrid from '../components/OwnerOrdersAgGrid';
import PackingSettlementModal from '../components/PackingSettlementModal';
import DisputesModal from '../components/DisputesModal';
import { ShieldAlert } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, NEW, PREPARING, READY, COMPLETED
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToReject, setOrderToReject] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState(null);
  
  // CartSettle Hackathon Views & Modals
  const [viewMode, setViewMode] = useState('AG_GRID'); // 'AG_GRID' | 'CLASSIC'
  const [settlementOrder, setSettlementOrder] = useState(null);
  const [isDisputesModalOpen, setIsDisputesModalOpen] = useState(false);

  const fetchOrders = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const response = await api.get('/orders/', { params: { t: Date.now() } });
      setOrders(response.data.results || response.data);
    } catch (err) {
      console.error(err);
      if (!isPoll) toast.error('Failed to fetch orders.');
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  const confirmRejectOrder = async () => {
    if (!orderToReject) return;
    setIsRejecting(true);
    try {
      await api.patch(`/orders/${orderToReject.id}/status/`, { status: 'REJECTED' });
      toast.success(`Order #${orderToReject.id} has been rejected.`);
      setOrderToReject(null);
      fetchOrders(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reject order.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleWsMessage = useCallback((data) => {
    if (!data || !data.type) return;
    if (data.type === 'NEW_ORDER') {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {});
      } catch {}
      toast.success(`New Order #${data.order?.id} received`, { duration: 6000 });
      fetchOrders(true);
    } else if (data.type === 'ORDER_STATUS_CHANGED' || data.type === 'SETTLEMENT_UPDATE') {
      fetchOrders(true);
    }
  }, []);

  const { isConnected: isWsConnected } = useWebSocket({
    path: '/ws/owner/orders/',
    onMessage: handleWsMessage,
  });

  useEffect(() => {
    fetchOrders();
    const pollTime = isWsConnected ? 30000 : 8000;
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrders(true);
    }, pollTime);
    return () => clearInterval(interval);
  }, [isWsConnected]);

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filter === 'ALL' || order.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      order.id.toLowerCase().includes(searchLower) || 
      (order.customer_name && order.customer_name.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50' };
      case 'ACCEPTED':
        return { badge: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' };
      case 'PREPARING':
        return { badge: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50' };
      case 'READY':
        return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' };
      case 'COMPLETED':
        return { badge: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' };
      case 'REJECTED':
        return { badge: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50' };
      default:
        return { badge: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Orders & Settlements</h1>
            {isWsConnected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            CartSettle packing verification, PayPal authorizations & dynamic partial capture
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 sm:items-center">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('AG_GRID')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'AG_GRID'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              AG Grid (Enterprise)
            </button>
            <button
              onClick={() => setViewMode('CLASSIC')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'CLASSIC'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Classic View
            </button>
          </div>

          <button
            onClick={() => setIsDisputesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap"
            title="Inspect PayPal Disputes API v1 & submit optical fulfillment evidence"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            PayPal Disputes
          </button>

          <button 
            onClick={() => fetchOrders(false)} 
            className="px-3.5 py-1.5 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium shadow-2xs transition whitespace-nowrap"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main View Display: AG Grid (Sponsor Prize) vs Classic Table */}
      {viewMode === 'AG_GRID' ? (
        <OwnerOrdersAgGrid
          orders={orders}
          loading={loading}
          onRefresh={() => fetchOrders(false)}
          onOpenSettlement={(order) => setSettlementOrder(order)}
          onViewDetails={(order) => {
            navigate(`/owner/orders/${order.id}`);
          }}
        />
      ) : (
        /* Classic Table View */
        <div className="space-y-4">
          <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
            {['ALL', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'REJECTED'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  filter === status 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {status}
                {status !== 'ALL' && status !== 'COMPLETED' && status !== 'REJECTED' && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    filter === status 
                      ? 'bg-slate-700 text-slate-100 dark:bg-slate-200 dark:text-slate-800' 
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {orders.filter(o => o.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            {loading && orders.length === 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4 w-full">
                       <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24"></div>
                       <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">No orders found</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">There are no orders matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="font-medium px-4 py-3">Order ID</th>
                      <th className="font-medium px-4 py-3">Customer</th>
                      <th className="font-medium px-4 py-3">Status</th>
                      <th className="font-medium px-4 py-3">Amount</th>
                      <th className="font-medium px-4 py-3">Payment</th>
                      <th className="font-medium px-4 py-3">Date</th>
                      <th className="font-medium px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredOrders.map((order) => {
                      const styles = getStatusBadge(order.status);
                      return (
                        <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                          <td className="px-4 py-3">
                            <Link to={`/owner/orders/${order.id}`} className="font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                              #{order.id}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {order.customer_name || `User: ${order.customer}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles.badge}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-900 dark:text-white">${parseFloat(order.total_amount).toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3">
                            {order.paypal_authorization_id ? (
                              <span className="text-xs font-bold text-amber-600">PayPal Auth</span>
                            ) : (
                              <span className="text-xs text-slate-500">{order.payment_method}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            {order.paypal_authorization_id && !order.paypal_capture_id && order.status !== 'REJECTED' && (
                              <button
                                onClick={() => setSettlementOrder(order)}
                                className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                              >
                                Settle Pack
                              </button>
                            )}
                            <Link
                              to={`/owner/orders/${order.id}`}
                              className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Packing Settlement Modal */}
      {settlementOrder && (
        <PackingSettlementModal
          order={settlementOrder}
          isOpen={Boolean(settlementOrder)}
          onClose={() => setSettlementOrder(null)}
          onSettled={() => {
            setSettlementOrder(null);
            fetchOrders(true);
          }}
        />
      )}

      {/* Reject Modal */}
      {orderToReject && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Reject Order</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Order #{orderToReject.id}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to reject this order? This will cancel the order and void any PayPal authorizations.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToReject(null)}
                disabled={isRejecting}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRejectOrder}
                disabled={isRejecting}
                className="px-4 py-2 text-white font-medium bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm text-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isRejecting ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedInvoiceOrderId && (
        <InvoiceModal
          orderId={selectedInvoiceOrderId}
          onClose={() => setSelectedInvoiceOrderId(null)}
        />
      )}
    </div>
  );
};

export default Orders;
