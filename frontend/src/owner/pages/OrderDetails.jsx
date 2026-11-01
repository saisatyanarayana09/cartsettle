import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, CheckCircle, Package, Clock, XCircle, ChevronRight, 
  Printer, MapPin, Phone, AlertTriangle, X, Loader2, Truck, Key 
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import InvoiceModal from '../components/InvoiceModal';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [packedItems, setPackedItems] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [ownerNote, setOwnerNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Delivery Partner State
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [assigningPartner, setAssigningPartner] = useState(false);

  // In-app Confirmation Modals
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const fetchOrder = useCallback(async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const response = await api.get(`/orders/${id}/`, { params: { t: Date.now() } });
      setOrder(response.data);
      if (!isPoll) {
        setOwnerNote(response.data.owner_note || '');
        if (response.data.delivery_partner) {
          setSelectedPartnerId(String(response.data.delivery_partner));
        }
      }
    } catch (err) {
      console.error(err);
      if (!isPoll) setError('Failed to fetch order details.');
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, [id]);

  // Load registered delivery partners for assignment
  useEffect(() => {
    api.get('/delivery/partners/')
      .then(res => setDeliveryPartners(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrder(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const updateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      await api.patch(`/orders/${id}/status/`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      setIsRejectModalOpen(false);
      fetchOrder();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to update order status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const togglePacked = (itemId) => {
    setPackedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await api.patch(`/orders/${id}/owner_note/`, { owner_note: ownerNote });
      toast.success('Note saved successfully');
      fetchOrder();
    } catch (err) {
      toast.error('Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  const confirmRejectItem = async () => {
    if (!rejectingItem) return;
    setIsUpdating(true);
    try {
      const res = await api.post(`/orders/${id}/reject_item/`, { item_id: rejectingItem.id });
      setOrder(res.data);
      toast.success(`Rejected "${rejectingItem.product_name_snapshot}"`);
      setRejectingItem(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reject item');
    } finally {
      setIsUpdating(false);
    }
  };

 const handleGetDirections = (e) => {
   e.preventDefault();
   const destination = `${order.delivery_latitude},${order.delivery_longitude}`;
   if (!navigator.geolocation) {
     window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
     return;
   }

   setGettingLocation(true);
   navigator.geolocation.getCurrentPosition(
     (position) => {
       setGettingLocation(false);
       const origin = `${position.coords.latitude},${position.coords.longitude}`;
       window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`, '_blank');
     },
     (error) => {
       setGettingLocation(false);
       console.warn("Location error:", error);
       window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
     },
     { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
   );
 };

  const handleAssignPartner = async () => {
    setAssigningPartner(true);
    try {
      await api.post(`/orders/${id}/assign_partner/`, {
        delivery_partner_id: selectedPartnerId ? parseInt(selectedPartnerId) : null
      });
      toast.success(selectedPartnerId ? 'Delivery partner assigned! 🛵' : 'Delivery partner unassigned.');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign partner.');
    } finally {
      setAssigningPartner(false);
    }
  };


  if (loading && !order) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-500 dark:text-slate-400 font-medium">
        Loading order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center space-y-4">
        <p className="text-rose-600 dark:text-rose-400 font-bold">{error || 'Order not found.'}</p>
        <Link to="/owner/orders" className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-sm font-bold">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
      </div>
    );
  }

  const activeItems = order.items.filter(item => item.status !== 'REJECTED');
  const allPacked = activeItems.length > 0 && activeItems.every(item => packedItems[item.id]);

  const getStatusBanner = () => {
    switch (order.status) {
      case 'NEW':
        return { bg: 'border-indigo-200/60 bg-indigo-50/50 dark:border-indigo-800/50 dark:bg-indigo-900/10', text: 'New Order Received', msg: 'Review items and accept or reject the order.', icon: Clock, textClass: 'text-indigo-900 dark:text-indigo-100', iconClass: 'text-indigo-600 dark:text-indigo-400' };
      case 'ACCEPTED':
        return { bg: 'border-blue-200/60 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-900/10', text: 'Order Accepted', msg: 'Begin gathering and packing the grocery items.', icon: Package, textClass: 'text-blue-900 dark:text-blue-100', iconClass: 'text-blue-600 dark:text-blue-400' };
      case 'PREPARING':
        return { bg: 'border-amber-200/60 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10', text: 'Packing Order', msg: 'Check off items as you place them into bags.', icon: Clock, textClass: 'text-amber-900 dark:text-amber-100', iconClass: 'text-amber-600 dark:text-amber-400' };
      case 'READY':
        return { bg: 'border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/10', text: 'Ready for Handover', msg: order.order_type === 'DELIVERY' ? 'Ready for delivery dispatch.' : 'Waiting for customer pickup.', icon: CheckCircle, textClass: 'text-emerald-900 dark:text-emerald-100', iconClass: 'text-emerald-600 dark:text-emerald-400' };
      case 'OUT_FOR_DELIVERY':
        return { bg: 'border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/10', text: 'Out for Delivery', msg: `Order is with ${order.delivery_partner_name || 'delivery rider'}.`, icon: Truck, textClass: 'text-emerald-900 dark:text-emerald-100', iconClass: 'text-emerald-600 dark:text-emerald-400' };
      case 'COMPLETED':
        return { bg: 'border-slate-200 dark:bg-slate-800/40 bg-slate-50', text: 'Order Completed', msg: 'Delivered and payment settled.', icon: CheckCircle, textClass: 'text-slate-900 dark:text-slate-100', iconClass: 'text-slate-600 dark:text-slate-400' };
      case 'REJECTED':
        return { bg: 'border-rose-200/60 bg-rose-50/50 dark:border-rose-800/50 dark:bg-rose-900/10', text: 'Order Rejected', msg: 'This order was declined by the store.', icon: XCircle, textClass: 'text-rose-900 dark:text-rose-100', iconClass: 'text-rose-600 dark:text-rose-400' };
      default:
        return { bg: 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/10', text: order.status, msg: '', icon: Clock, textClass: 'text-slate-900 dark:text-slate-100', iconClass: 'text-slate-600 dark:text-slate-400' };
    }
  };

  const banner = getStatusBanner();
  const BannerIcon = banner.icon;

  const renderActionButtons = (isMobileView = false) => {
    if (!['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(order.status)) return null;

    return (
      <div className={`bg-white dark:bg-[#0d1322] rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-5 transition-colors ${isMobileView ? 'block md:hidden' : 'hidden md:block'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {isMobileView ? 'Quick Action' : 'Next Step'}
          </h3>
          {isUpdating && (
            <span className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <Loader2 size={13} className="animate-spin" /> Updating...
            </span>
          )}
        </div>

        {order.status === 'NEW' && (
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => updateStatus('ACCEPTED')} 
              disabled={isUpdating} 
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-md font-medium transition-all shadow-sm flex items-center justify-center gap-1.5 text-sm disabled:opacity-60"
            >
              Accept Order <ChevronRight size={16}/>
            </button>
            <button 
              onClick={() => setIsRejectModalOpen(true)} 
              disabled={isUpdating} 
              className="w-full py-2 px-4 bg-white dark:bg-[#0d1322] text-rose-600 dark:text-rose-400 rounded-md font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-sm border border-rose-200 dark:border-rose-800/80 disabled:opacity-60"
            >
              Reject Order
            </button>
          </div>
        )}

        {order.status === 'ACCEPTED' && (
          <button 
            onClick={() => updateStatus('PREPARING')} 
            disabled={isUpdating} 
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-md font-medium transition-all flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-60"
          >
            <Package size={16}/> Start Packing
          </button>
        )}

        {order.status === 'PREPARING' && (
          <div className="space-y-2">
            <button 
              onClick={() => updateStatus('READY')} 
              disabled={isUpdating || !allPacked} 
              className={`w-full py-2.5 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 text-sm ${
                allPacked 
                  ? 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle size={16}/> Mark as Ready
            </button>
            {!allPacked && (
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Check off all {activeItems.length} active items first.
              </p>
            )}
          </div>
        )}

        {order.status === 'READY' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-md border border-slate-200 dark:border-slate-700">
              {parseFloat(order.total_amount) > 0 ? (
                <>Collect <strong className="text-slate-900 dark:text-white font-semibold">₹{order.total_amount}</strong> {order.order_type === 'DELIVERY' ? 'via COD' : 'at store'}.</>
              ) : (
                <>Order fully paid via <strong className="text-slate-900 dark:text-white font-semibold">Wallet</strong>.</>
              )}
            </p>
            <button 
              onClick={() => updateStatus('COMPLETED')} 
              disabled={isUpdating} 
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-md font-medium transition-colors flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-60"
            >
              {parseFloat(order.total_amount) > 0 ? 'Payment Received' : 'Handover & Complete'}
            </button>
          </div>
        )}

        {order.status === 'OUT_FOR_DELIVERY' && (
          <div className="space-y-3">
            <button 
              onClick={() => updateStatus('COMPLETED')} 
              disabled={isUpdating} 
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-md font-medium transition-colors flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-60"
            >
              <CheckCircle size={16} /> Mark Delivered
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 mb-12">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <Link 
            to="/owner/orders" 
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-md transition-colors"
          >
            <ArrowLeft size={16}/>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Order {order.id}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Placed on {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setIsInvoiceModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium shadow-sm transition-colors"
        >
          <Printer size={14}/> Invoice
        </button>
      </div>

      <div className={`border ${banner.bg} rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md bg-white/60 dark:bg-slate-950/20 ${banner.iconClass}`}>
            <BannerIcon className="w-5 h-5"/>
          </div>
          <div>
            <h2 className={`text-base font-semibold ${banner.textClass}`}>{banner.text}</h2>
            <p className={`text-sm mt-0.5 opacity-90 ${banner.textClass}`}>{banner.msg}</p>
          </div>
        </div>
      </div>

      {order.payment_method === 'UPI' && ['NEW', 'ACCEPTED', 'PREPARING'].includes(order.status) && (
        <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-start gap-3 shadow-sm">
           <AlertTriangle className="text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" size={18} />
           <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-white">Verify UPI Payment</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Amount: <span className="font-medium text-slate-900 dark:text-slate-200">₹{order.total_amount}</span>. 
                UTR / Ref: <span className="font-mono font-medium text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">{order.upi_transaction_id || 'N/A'}</span>
              </p>
           </div>
        </div>
      )}

      {renderActionButtons(true)}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#0d1322] rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Items ({activeItems.length})</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {order.items.map(item => {
                const isRejected = item.status === 'REJECTED';
                return (
                  <div 
                    key={item.id} 
                    className={`p-4 flex items-center gap-4 transition-colors ${
                      order.status === 'PREPARING' && packedItems[item.id] 
                        ? 'bg-slate-50/50 dark:bg-slate-800/20' 
                        : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/20'
                    }`}
                    onClick={() => order.status === 'PREPARING' && !isRejected && togglePacked(item.id)}
                  >
                    {order.status === 'PREPARING' && (
                      <div className="flex-shrink-0 cursor-pointer">
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-all duration-200 ${
                          isRejected 
                            ? 'border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800' 
                            : packedItems[item.id] 
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' 
                              : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}>
                          {packedItems[item.id] && !isRejected && <CheckCircle className="w-3.5 h-3.5"/>}
                          {isRejected && <XCircle className="w-3.5 h-3.5 text-slate-400"/>}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-medium ${
                          isRejected || (packedItems[item.id] && order.status === 'PREPARING')
                            ? 'text-slate-500 dark:text-slate-400 line-through opacity-80' 
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {item.product_name_snapshot}
                        </h3>
                        {isRejected && (
                          <span className="text-[10px] font-medium text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                            Rejected
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${isRejected ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.unit_snapshot} • ₹{item.price_snapshot}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                      <p className={`text-sm font-medium ${isRejected ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                        {item.quantity} × ₹{item.price_snapshot}
                      </p>
                      <p className={`text-sm font-semibold mt-0.5 ${isRejected ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                        ₹{item.subtotal}
                      </p>
                      
                      {!isRejected && ['NEW', 'ACCEPTED', 'PREPARING'].includes(order.status) && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setRejectingItem(item); }}
                          className="mt-1 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#0d1322] rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Notes</h2>
            </div>
            <div className="p-5 space-y-4">
              {order.customer_note ? (
                <div>
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Customer Note</h3>
                  <p className="text-sm text-slate-900 dark:text-slate-200 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">{order.customer_note}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No customer instructions.</p>
              )}
              
              <div className="pt-2">
                <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Store Note</h3>
                <textarea 
                  value={ownerNote} 
                  onChange={e => setOwnerNote(e.target.value)} 
                  placeholder="Internal fulfillment note..."
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-md p-3 text-sm focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none resize-none h-20"
                />
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={saveNote}
                    disabled={savingNote}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {savingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {renderActionButtons(false)}

          <div className="bg-white dark:bg-[#0d1322] rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-5">
            <div>
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Customer</h3>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {order.customer_name || `Customer #${order.customer}`}
              </p>
              {order.customer_phone && (
                <a 
                  href={`tel:${order.customer_phone}`}
                  className="inline-block text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 hover:text-slate-900 dark:hover:text-white"
                >
                  {order.customer_phone}
                </a>
              )}
              {order.customer_email && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.customer_email}</p>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {order.order_type === 'DELIVERY' ? 'Delivery Slot' : 'Pickup Slot'}
              </h3>
              <p className="font-medium text-slate-900 dark:text-white text-sm">
                {order.delivery_slot_label || order.pickup_time || 'Standard Fulfillment'}
              </p>
              {order.delivery_slot_date && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.delivery_slot_date}</p>
              )}
            </div>

            {order.order_type === 'DELIVERY' && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
                <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Address</h3>
                <p className="font-medium text-slate-900 dark:text-white text-sm whitespace-pre-line leading-relaxed">
                  {order.delivery_address || 'No address provided.'}
                </p>
                {order.delivery_pincode && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{order.delivery_pincode}</p>
                )}
                
                {order.delivery_latitude && order.delivery_longitude && (
                  <button 
                    onClick={handleGetDirections}
                    disabled={gettingLocation}
                    className="mt-2 flex items-center justify-center w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium py-1.5 px-3 rounded-md transition-colors text-xs disabled:opacity-60"
                  >
                    <MapPin className="w-3.5 h-3.5 mr-1.5" /> 
                    {gettingLocation ? 'Locating...' : 'Directions'}
                  </button>
                )}
              </div>
            )}

            {order.order_type === 'DELIVERY' && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Delivery Partner</h3>
                  {order.delivery_otp && (
                    <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                      OTP: {order.delivery_otp}
                    </span>
                  )}
                </div>

                {order.delivery_partner_name ? (
                  <div className="text-sm space-y-0.5">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {order.delivery_partner_name}
                    </p>
                    {order.delivery_partner_phone && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{order.delivery_partner_phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Unassigned</p>
                )}

                {['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex gap-2">
                      <select
                        value={selectedPartnerId}
                        onChange={(e) => setSelectedPartnerId(e.target.value)}
                        className="flex-1 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-700 text-xs rounded-md px-2 py-1.5 text-slate-900 dark:text-white outline-none"
                      >
                        <option value="">-- Select Rider --</option>
                        {deliveryPartners.map((dp) => (
                          <option key={dp.id} value={dp.id}>{dp.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssignPartner}
                        disabled={assigningPartner}
                        className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs rounded-md transition disabled:opacity-50 shrink-0"
                      >
                        {assigningPartner ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  ₹{activeItems.reduce((acc, item) => acc + parseFloat(item.subtotal), 0).toFixed(2)}
                </span>
              </div>
              {parseFloat(order.delivery_fee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Delivery</span>
                  <span className="text-slate-900 dark:text-white font-medium">₹{order.delivery_fee}</span>
                </div>
              )}
              {parseFloat(order.packaging_fee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Packaging</span>
                  <span className="text-slate-900 dark:text-white font-medium">₹{parseFloat(order.packaging_fee).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(order.promo_discount) > 0 && (
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Promo</span>
                  <span>-₹{parseFloat(order.promo_discount).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(order.wallet_discount) > 0 && (
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Wallet</span>
                  <span>-₹{parseFloat(order.wallet_discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Total</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">₹{order.total_amount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isRejectModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0d1322] rounded-lg w-full max-w-md p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle size={20} />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Decline Order?</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Reject Order <strong className="font-mono text-slate-900 dark:text-white">#{order.id}</strong> (Total: ₹{order.total_amount})? The customer will be informed and funds returned.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isUpdating}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateStatus('REJECTED')}
                disabled={isUpdating}
                className="px-4 py-2 text-white font-medium bg-rose-600 rounded-md hover:bg-rose-700 transition-colors shadow-sm text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {rejectingItem && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0d1322] rounded-lg w-full max-w-md p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle size={20} />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Reject Item?</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Remove <strong className="text-slate-900 dark:text-white">"{rejectingItem.product_name_snapshot}"</strong> from the order? The total will be reduced by ₹{rejectingItem.subtotal}.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                disabled={isUpdating}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRejectItem}
                disabled={isUpdating}
                className="px-4 py-2 text-white font-medium bg-rose-600 rounded-md hover:bg-rose-700 transition-colors shadow-sm text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isInvoiceModalOpen && (
        <InvoiceModal
          orderId={id}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}
    </div>
  );
};

export default OrderDetails;
