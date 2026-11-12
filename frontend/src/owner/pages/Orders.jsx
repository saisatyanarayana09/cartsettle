import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from '../../router';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import InvoiceModal from '../components/InvoiceModal';
import OwnerOrdersAgGrid from '../components/OwnerOrdersAgGrid';
import PackingSettlementModal from '../components/PackingSettlementModal';
import DisputesModal from '../components/DisputesModal';
import { useWebSocket } from '../../hooks/useWebSocket';

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderToReject, setOrderToReject] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState(null);
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-[#E7DBCF] dark:border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[#2D1822] dark:text-white">Orders & Settlements</h1>
            {isWsConnected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
              </span>
            )}
          </div>
          <p className="text-sm text-[#7D6671] dark:text-[#C5B0BA] mt-1">
            Enterprise order management, PayPal authorizations & dynamic partial packing settlement
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 sm:items-center">
          <button
            onClick={() => setIsDisputesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7DBCF] dark:border-white/10 bg-white hover:bg-[#FAF5EF] dark:bg-[#351D28] dark:hover:bg-[#432634] text-[#56323E] dark:text-[#FAF5EF] text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap"
            title="Inspect PayPal Disputes API v1 & submit optical fulfillment evidence"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#56323E] dark:text-[#EFDFD2]" />
            PayPal Disputes
          </button>

          <button 
            onClick={() => fetchOrders(false)} 
            className="px-3.5 py-1.5 bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/10 text-[#56323E] dark:text-[#FAF5EF] rounded-xl hover:bg-[#FAF5EF] dark:hover:bg-[#432634] text-xs font-medium shadow-2xs transition whitespace-nowrap"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main Enterprise AG Grid View */}
      <OwnerOrdersAgGrid
        orders={orders}
        loading={loading}
        onRefresh={() => fetchOrders(false)}
        onOpenSettlement={(order) => setSettlementOrder(order)}
        onViewDetails={(order) => {
          navigate(`/owner/orders/${order.id}`);
        }}
      />

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#56323E]/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/[0.08] rounded-xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2D1822] dark:text-white">Reject Order</h3>
                <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA]">Order #{orderToReject.id}</p>
              </div>
            </div>
            <p className="text-sm text-[#5E4752] dark:text-[#C5B0BA] leading-relaxed">
              Are you sure you want to reject this order? This will cancel the order and void any PayPal authorizations.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToReject(null)}
                disabled={isRejecting}
                className="px-4 py-2 text-[#5E4752] dark:text-[#C5B0BA] font-medium bg-[#F2E9E0] dark:bg-[#3F2231] rounded-lg hover:bg-[#EFDFD2] dark:hover:bg-[#432634] transition-colors text-sm cursor-pointer"
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
