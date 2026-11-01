import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Truck, Phone, MapPin, Navigation, CheckCircle2, 
  Package, Clock, ChevronDown, ChevronUp, 
  ShieldCheck, AlertCircle, RefreshCw, X, ArrowUpRight,
  Banknote, Bell, Check, Sparkles, Satellite, Map
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import DeliveryLiveMap from './DeliveryLiveMap';

export default function DeliveryDashboard() {
  const { fetchStatus } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedMaps, setExpandedMaps] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [notifiedArrival, setNotifiedArrival] = useState({});
  const [notifyingArrival, setNotifyingArrival] = useState({});

  const toggleMap = (orderId) => {
    setExpandedMaps(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // 4-Digit Split OTP Modal State
  const [otpModalOrder, setOtpModalOrder] = useState(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Live GPS Streaming via continuous watchPosition (high accuracy)
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'active' | 'error' | 'denied'
  const [lastGpsTime, setLastGpsTime] = useState(null);
  const watchIdRef = useRef(null);
  const lastBroadcastTimeRef = useRef(0);
  const lastCoordsRef = useRef({ lat: null, lng: null });

  // Stream rider GPS continuously whenever orders are in progress
  const deliveryOrders = dashboardData?.active_orders || [];
  const hasActiveDeliveries = deliveryOrders.some(
    o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'READY'
  );

  useEffect(() => {
    if (!hasActiveDeliveries) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus('idle');
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    const handlePosition = async (pos) => {
      const now = Date.now();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const heading = pos.coords.heading;
      const speed = pos.coords.speed;

      // Throttle: broadcast at most once every 3.5 seconds
      const timeSinceLast = now - lastBroadcastTimeRef.current;
      if (timeSinceLast < 3500 && lastCoordsRef.current.lat !== null) {
        return;
      }

      lastBroadcastTimeRef.current = now;
      lastCoordsRef.current = { lat, lng };

      try {
        await api.post('/delivery/location/update/', {
          latitude: lat,
          longitude: lng,
          heading: heading != null && !isNaN(heading) ? heading : null,
          speed: speed != null && !isNaN(speed) ? speed : null,
        });
        setGpsStatus('active');
        setLastGpsTime(new Date());
      } catch (err) {
        console.warn('GPS broadcast failed:', err);
        setGpsStatus('error');
      }
    };

    const handleError = (err) => {
      console.warn('Live GPS watch error:', err.message);
      setGpsStatus(err.code === 1 ? 'denied' : 'error');
    };

    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 10000,
    });

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [hasActiveDeliveries]);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get('/delivery/dashboard/');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      if (!silent) toast.error('Failed to sync delivery dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-poll active orders every 12 seconds for order status updates
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/delivery/dashboard/');
        setDashboardData(res.data);
        fetchStatus?.();
      } catch (err) {
        console.error('Silent poll error:', err);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Action: Pickup from Store
  const handlePickup = async (orderId) => {
    setActionLoading(prev => ({ ...prev, [orderId]: 'pickup' }));
    try {
      await api.post(`/delivery/orders/${orderId}/pickup/`);
      toast.success(`Order #${orderId} marked Out for Delivery! 🛵`);
      fetchDashboard(true);
      fetchStatus?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to pickup order.');
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: null }));
    }
  };

  // Open OTP Verification Modal
  const openOtpModal = (order) => {
    setOtpModalOrder(order);
    setOtpDigits(['', '', '', '']);
    setOtpError('');
    setTimeout(() => {
      inputRefs[0]?.current?.focus();
    }, 100);
  };

  // Submit OTP to Complete Delivery
  const submitOtpVerification = async (targetDigits, currentOrder) => {
    const orderToSubmit = currentOrder || otpModalOrder;
    if (!orderToSubmit) return;

    const enteredOtp = (targetDigits || otpDigits).join('');
    if (enteredOtp.length !== 4) {
      setOtpError('Please enter the full 4-digit OTP provided by the customer.');
      return;
    }

    setSubmittingOtp(true);
    setOtpError('');

    try {
      await api.post(`/delivery/orders/${orderToSubmit.id}/complete/`, {
        otp: enteredOtp
      });
      toast.success(`Order #${orderToSubmit.id} Delivered Successfully! 🎉`, { duration: 4000 });
      setOtpModalOrder(null);
      setOtpDigits(['', '', '', '']);
      fetchDashboard(true);
      fetchStatus?.();
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Invalid OTP code. Ask customer to verify their screen.');
    } finally {
      setSubmittingOtp(false);
    }
  };

  // Handle individual OTP digit change with auto-advance and auto-submit on 4th digit
  const handleOtpDigitChange = (index, value) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setOtpError('');

    if (char && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    } else if (char && index === 3) {
      // All 4 digits entered -> auto submit!
      if (newDigits.every(d => d.length === 1)) {
        submitOtpVerification(newDigits, otpModalOrder);
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const newDigits = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    if (pasted.length === 4) {
      inputRefs[3]?.current?.focus();
      submitOtpVerification(newDigits, otpModalOrder);
    } else {
      inputRefs[pasted.length]?.current?.focus();
    }
  };

  const handleNotifyArrival = async (orderId) => {
    setNotifyingArrival(prev => ({ ...prev, [orderId]: true }));
    try {
      await api.post(`/delivery/orders/${orderId}/notify-arrival/`);
      setNotifiedArrival(prev => ({ ...prev, [orderId]: true }));
      toast.success("Customer notified: Rider is 2 minutes away! 🛵", { duration: 3500 });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not notify customer.");
    } finally {
      setNotifyingArrival(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const activeOrders = dashboardData?.active_orders || [];
  const completedTodayCount = dashboardData?.completed_today_count || 0;
  const activeValue = activeOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="size-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Loading delivery tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streamlined Live Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Narendra Kirana Partner Fleet</p>
            <p className="text-xs text-slate-400">Live order assignments update automatically every 12s</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* GPS Status Badge */}
          {gpsStatus === 'active' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              <Satellite size={13} className="animate-pulse" />
              <span>GPS Live</span>
            </div>
          )}
          {gpsStatus === 'error' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
              <Satellite size={13} />
              <span>GPS Error</span>
            </div>
          )}
          {gpsStatus === 'denied' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold">
              <Satellite size={13} />
              <span>GPS Denied</span>
            </div>
          )}

          <button
            onClick={() => fetchDashboard(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-bold text-slate-300 transition active:scale-95 cursor-pointer border border-slate-700/60"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Deliveries'}</span>
          </button>
        </div>
      </div>

      {/* KPI Chips Grid */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Assigned</p>
          <p className="text-xl sm:text-2xl font-black text-white">{activeOrders.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">trips active</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Delivered Today</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">{completedTodayCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">orders completed</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Trip Value</p>
          <p className="text-xl sm:text-2xl font-black text-white">₹{activeValue}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">pending collection</p>
        </div>
      </div>

      {/* Orders Section Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-black text-white">Active Assignments</h2>
          {activeOrders.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black border border-emerald-500/30">
              {activeOrders.length}
            </span>
          )}
        </div>
      </div>

      {/* Empty State */}
      {activeOrders.length === 0 ? (
        <div className="text-center py-20 px-6 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center">
          <div className="size-16 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center mb-3.5 shadow-inner">
            <Truck size={30} />
          </div>
          <h3 className="text-base font-bold text-slate-200">No active delivery assignments</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
            When the store dispatches orders to you, they will appear right here in real time. Keep this page open.
          </p>
        </div>
      ) : (
        /* Order Cards Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
          {activeOrders.map((order) => {
            const isExpanded = Boolean(expandedOrders[order.id]);
            const isReadyForPickup = order.status === 'READY';
            const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
            const isCod = order.payment_method === 'COD';

            const mapsUrl = order.delivery_latitude && order.delivery_longitude
              ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`
              : order.delivery_address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`
              : null;

            return (
              <div 
                key={order.id} 
                className={`bg-slate-900/95 border rounded-3xl p-5 sm:p-6 shadow-xl shadow-black/40 space-y-4 transition-all ${
                  isOutForDelivery 
                    ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' 
                    : 'border-amber-500/40 ring-1 ring-amber-500/20'
                }`}
              >
                {/* Header: Order ID & Status */}
                <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-white">
                        #{order.id}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isOutForDelivery
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {isOutForDelivery ? 'Out for Delivery 🛵' : 'Ready at Store 📦'}
                      </span>
                    </div>

                    {order.delivery_slot_label && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                        <Clock size={12} className="text-slate-500" />
                        <span>Slot: <strong className="text-slate-200">{order.delivery_slot_label}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Payment Pill */}
                  <div className="text-right">
                    <span className={`inline-block text-xs font-black px-2.5 py-1 rounded-xl ${
                      isCod
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {isCod ? `Collect Cash: ₹${order.total_amount}` : 'PREPAID ₹0'}
                    </span>
                  </div>
                </div>

                {/* Compact Payment Instruction */}
                {isCod ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5 text-amber-200">
                    <Banknote size={20} className="text-amber-400 shrink-0" />
                    <div className="text-xs">
                      <strong className="block font-black text-amber-300 uppercase tracking-wide text-[10px]">
                        Cash on Delivery
                      </strong>
                      <span>Collect exact <strong className="text-white font-bold">₹{order.total_amount}</strong> before OTP handover.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-emerald-200">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    <div className="text-xs">
                      <strong className="block font-black text-emerald-300 uppercase tracking-wide text-[10px]">
                        Prepaid Order (Paid Online)
                      </strong>
                      <span>Do NOT collect cash. Order is paid in full.</span>
                    </div>
                  </div>
                )}

                {/* Customer Contact & Call Action */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</p>
                    <p className="text-sm font-black text-white truncate">{order.customer_name || 'Customer'}</p>
                    {order.customer_phone && (
                      <p className="text-xs text-slate-400 mt-0.5">{order.customer_phone}</p>
                    )}
                  </div>

                  {order.customer_phone && (
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Phone size={14} />
                      <span>Call</span>
                    </a>
                  )}
                </div>

                {/* Delivery Location & GPS Action */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Address</p>
                      <p className="text-xs font-medium text-slate-200 leading-relaxed break-words mt-0.5">
                        {order.delivery_address || 'No street address specified.'}
                      </p>
                      {order.delivery_pincode && (
                        <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          PIN: {order.delivery_pincode}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interactive Live Navigation Map Toggle Button */}
                  <button
                    type="button"
                    onClick={() => toggleMap(order.id)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer ${
                      expandedMaps[order.id]
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                    }`}
                  >
                    <Map size={15} className={expandedMaps[order.id] ? 'text-emerald-400' : ''} />
                    <span>{expandedMaps[order.id] ? 'Hide Live Map' : 'View Live Interactive Map'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 font-mono">
                      {expandedMaps[order.id] ? '▲' : '▼'}
                    </span>
                  </button>

                  {/* Embedded Interactive Live Map */}
                  {expandedMaps[order.id] && (
                    <div className="pt-1">
                      <DeliveryLiveMap 
                        order={order} 
                        onClose={() => toggleMap(order.id)} 
                      />
                    </div>
                  )}

                  {/* External Google Navigation shortcut */}
                  {mapsUrl && !expandedMaps[order.id] && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700/80 transition active:scale-98 cursor-pointer"
                    >
                      <Navigation size={13} className="text-indigo-400" />
                      <span>Open in Google Maps App</span>
                      <ArrowUpRight size={12} className="opacity-60" />
                    </a>
                  )}
                </div>

                {/* Package Items Accordion */}
                <div className="pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => toggleExpand(order.id)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-400 hover:text-slate-200 transition py-1 cursor-pointer"
                  >
                    <span>Package Items ({order.items?.length || 0} items)</span>
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0">
                          <span className="text-slate-300 font-medium">
                            {item.product_name_snapshot} × {item.quantity} {item.unit_snapshot}
                          </span>
                          <span className="text-slate-400 font-mono font-bold">₹{item.subtotal}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons */}
                {isReadyForPickup && (
                  <button
                    onClick={() => handlePickup(order.id)}
                    disabled={actionLoading[order.id] === 'pickup'}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading[order.id] === 'pickup' ? (
                      <span>Updating pickup...</span>
                    ) : (
                      <>
                        <Package size={17} />
                        <span>Picked Up from Store • Start Delivery</span>
                      </>
                    )}
                  </button>
                )}

                {isOutForDelivery && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleNotifyArrival(order.id)}
                      disabled={notifyingArrival[order.id] || notifiedArrival[order.id]}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer active:scale-98 ${
                        notifiedArrival[order.id]
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-amber-400 border-slate-700/80'
                      }`}
                    >
                      <Bell size={14} className={notifyingArrival[order.id] ? 'animate-bounce' : ''} />
                      <span>
                        {notifyingArrival[order.id]
                          ? 'Sending Alert...'
                          : notifiedArrival[order.id]
                          ? 'Arrival Alert Sent (2 Mins Away) ✓'
                          : 'Notify: Rider 2 Mins Away 🛵'}
                      </span>
                    </button>

                    <button
                      onClick={() => openOtpModal(order)}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:opacity-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-98 cursor-pointer"
                    >
                      <ShieldCheck size={18} />
                      <span>Enter Customer OTP & Handover</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4-Digit Split PIN OTP Verification Modal with Auto-Submit */}
      {otpModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-white">
            
            <button
              onClick={() => setOtpModalOrder(null)}
              className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6">
              <div className="size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ShieldCheck size={28} />
              </div>
              <h4 className="text-lg font-black">Customer OTP Verification</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ask <strong>{otpModalOrder.customer_name}</strong> for the 4-digit OTP shown on their Narendra Kirana order screen.
              </p>
            </div>

            {otpError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); submitOtpVerification(otpDigits, otpModalOrder); }} className="space-y-4">
              {/* 4 PIN Digits Box */}
              <div className="flex justify-center gap-2.5">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`PIN digit ${idx + 1}`}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="size-12 bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl text-center text-2xl font-mono font-black text-white outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                ))}
              </div>

              {otpModalOrder.payment_method === 'COD' && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold text-center">
                  💵 Please collect ₹{otpModalOrder.total_amount} in Cash before completing
                </div>
              )}

              <button
                type="submit"
                disabled={submittingOtp || otpDigits.join('').length !== 4}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submittingOtp ? (
                  <span>Verifying OTP...</span>
                ) : (
                  <>
                    <Check size={18} className="stroke-[3]" />
                    <span>Verify OTP & Complete Delivery</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

