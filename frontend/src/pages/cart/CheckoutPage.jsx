import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Link, useNavigate, Navigate } from '../../router';
import { ArrowLeft, CheckCircle2, MapPin, Edit2, Sparkles, AlertCircle, AlertTriangle, Clock, Calendar, QrCode, Smartphone, RefreshCw, Lock, ShieldCheck, Check, Copy, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import { QRCodeSVG } from 'qrcode.react';
import { checkOperatingHours, parseTimeSlots, isSlotPassedToday, getLocalDateStr, extractErrorMessage } from '../../utils/operatingHours';
import PayPalAuthorizeButton from '../../components/PayPalAuthorizeButton';

const MapLocationPicker = lazy(() => import('../../components/MapLocationPicker'));


export function CheckoutPage() {
   const navigate = useNavigate(); 
   const { cart, isCustomer, storeSettings, refresh, clearCart, flushCartSync, applyPromo } = useCart();
   // Promo / Coupon State & Handlers
   const [promoInput, setPromoInput] = useState('');
   const [promoError, setPromoError] = useState('');
   const [promoApplying, setPromoApplying] = useState(false);

   async function handleApplyPromo(e) {
     if (e) e.preventDefault();
     if (!promoInput.trim()) return;
     setPromoError('');
     setPromoApplying(true);
     try {
       await applyPromo(promoInput.trim().toUpperCase());
       setPromoInput('');
       toast.success('Coupon applied successfully!');
     } catch(err) {
       setPromoError(err?.response?.data?.detail || err?.response?.data?.error || 'Invalid promo code');
     } finally {
       setPromoApplying(false);
     }
   }

   async function handleRemovePromo() {
     setPromoError('');
     try {
       await applyPromo('');
       toast.success('Coupon removed');
     } catch {
       setPromoError('Failed to remove coupon');
     }
   }
 

   useEffect(() => {
     if (flushCartSync) {
       flushCartSync();
     }
   }, [flushCartSync]);

   const [time, setTime] = useState('As soon as possible'); 
   const [note, setNote] = useState(''); 
   const [error, setError] = useState(''); 
   const [loading, setLoading] = useState(false);
   const [walletBalance, setWalletBalance] = useState(0); 
   const [useWallet, setUseWallet] = useState(false);
   const [orderType, setOrderType] = useState('PICKUP');
   const [deliveryAddress, setDeliveryAddress] = useState('');
   const [deliveryPincode, setDeliveryPincode] = useState('');

   // Payment Method State
   const [paymentMethod, setPaymentMethod] = useState('PAYPAL'); // 'PAYPAL' | 'COD' | 'UPI'
   const [qrViewMode, setQrViewMode] = useState('dynamic'); // 'dynamic' | 'standee'
   const [upiTransactionId, setUpiTransactionId] = useState('');

   // Time Slot State
   const enableTimeSlots = Boolean(storeSettings?.enable_time_slots);
   const allTimeSlots = parseTimeSlots(storeSettings?.time_slots_json);
   const bufferMinutes = Number(storeSettings?.preparation_buffer_minutes || 0);

   const [slotDay, setSlotDay] = useState('today'); // 'today' | 'tomorrow'
   const [selectedSlotLabel, setSelectedSlotLabel] = useState('');

   const todaySlots = allTimeSlots.filter(s => !isSlotPassedToday(s, bufferMinutes));
   const tomorrowSlots = allTimeSlots;
   const activeSlotList = slotDay === 'today' ? todaySlots : tomorrowSlots;

   const todayStr = getLocalDateStr(new Date());
   const tomorrowDate = new Date();
   tomorrowDate.setDate(tomorrowDate.getDate() + 1);
   const tomorrowStr = getLocalDateStr(tomorrowDate);

   // Auto-switch to tomorrow if today has no slots left
   useEffect(() => {
     if (enableTimeSlots && allTimeSlots.length > 0) {
       if (todaySlots.length === 0 && slotDay === 'today') {
         setSlotDay('tomorrow');
       }
     }
   }, [enableTimeSlots, allTimeSlots.length, todaySlots.length, slotDay]);

   // Ensure an active slot is selected
   useEffect(() => {
     if (enableTimeSlots && activeSlotList.length > 0) {
       const exists = activeSlotList.some(s => s.label === selectedSlotLabel);
       if (!exists) {
         setSelectedSlotLabel(activeSlotList[0].label);
         setTime(activeSlotList[0].label);
       }
     }
   }, [enableTimeSlots, slotDay, activeSlotList, selectedSlotLabel]);

   // Emergency Pause & Operating Hours
   const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
   const emergencyPauseMsg = storeSettings?.emergency_pause_message || 'Online ordering is temporarily paused by the store due to high volume. We apologize for any inconvenience.';
   const operatingHours = checkOperatingHours(storeSettings);
   const isClosedHours = operatingHours.isClosed;
   
   // New Address Management State
   const [addresses, setAddresses] = useState([]);
   const [selectedAddressId, setSelectedAddressId] = useState(null);
   const [showAddressForm, setShowAddressForm] = useState(false);
   const [editingAddressId, setEditingAddressId] = useState(null);
   const [addressForm, setAddressForm] = useState({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null });
   const [showMapPicker, setShowMapPicker] = useState(false);
   const [successOrderId, setSuccessOrderId] = useState(null);
   
   const captureLocation = () => {
     const loadingToast = toast.loading("Getting your exact location...");
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (pos) => {
             setAddressForm({...addressForm, latitude: parseFloat(pos.coords.latitude.toFixed(6)), longitude: parseFloat(pos.coords.longitude.toFixed(6))});
             toast.success("Location captured successfully!", { id: loadingToast });
         },
         (err) => {
             toast.error("Could not fetch location. Please enable GPS.", { id: loadingToast });
         }
       );
     } else {
       toast.error("Geolocation not supported.", { id: loadingToast });
     }
   };

   const fetchAddresses = () => {
     api.get('/auth/addresses/').then(res => {
       const data = res.data.results || res.data;
       setAddresses(data);
       if (data && data.length > 0 && !selectedAddressId) {
         const defaultAddr = data.find(a => a.is_default) || data[0];
         setSelectedAddressId(defaultAddr.id);
       }
     }).catch(console.error);
   };

   useEffect(() => {
     if (isCustomer) {
       api.get('/auth/wallet/').then(res => setWalletBalance(parseFloat(res.data.balance))).catch(console.error);
       fetchAddresses();
     }
   }, [isCustomer]);

   // Whenever selected address changes, update the string fields for the backend payload
   useEffect(() => {
     if (selectedAddressId) {
       const addr = addresses.find(a => a.id === selectedAddressId);
       if (addr) {
         const formatted = [addr.street, addr.landmark, addr.city, addr.state].filter(Boolean).join(', ');
         setDeliveryAddress(formatted);
         setDeliveryPincode(addr.zip_code || '');
       }
     }
   }, [selectedAddressId, addresses]);

   const saveAddress = async (e) => {
     e.preventDefault();
     setLoading(true);
     try {
       if (editingAddressId) {
         await api.put(`/auth/addresses/${editingAddressId}/`, addressForm);
       } else {
         const res = await api.post('/auth/addresses/', addressForm);
         setSelectedAddressId(res.data.id);
         setAddresses(prev => [...prev, res.data]);
       }
       setShowAddressForm(false);
       setEditingAddressId(null);
       fetchAddresses();
     } catch (err) {
       setError(err.response?.data?.latitude?.[0] || err.response?.data?.detail || 'Failed to save address.');
     } finally {
       setLoading(false);
     }
   };

  if (!isCustomer) return <Navigate to="/cart" replace />;
 
  const mrpTotal = parseFloat(cart?.subtotal || 0);
  const discount = parseFloat(cart?.discount || 0);
  const itemsTotal = parseFloat(cart?.items_total || 0) || Math.max(0, mrpTotal - discount);
  const isDeliveryUnderMin = orderType === 'DELIVERY' && parseFloat(storeSettings?.min_delivery_order_amount) > 0 && itemsTotal < parseFloat(storeSettings.min_delivery_order_amount);

  const isHomeDeliveryActive = Boolean(storeSettings?.is_home_delivery_active || storeSettings?.delivery_mode === 'BOTH' || storeSettings?.delivery_mode === 'DELIVERY');

  let deliveryFee = 0;
  if (orderType === 'DELIVERY' && isHomeDeliveryActive) {
    if (parseFloat(storeSettings?.free_delivery_threshold) > 0 && itemsTotal >= parseFloat(storeSettings.free_delivery_threshold)) {
      deliveryFee = 0;
    } else {
      deliveryFee = parseFloat(storeSettings?.delivery_fee || 0);
    }
  }
  const cartTotal = parseFloat(cart?.total || 0) + deliveryFee;

 // Max wallet percentage limit
 const maxWalletPercentage = storeSettings?.max_wallet_usage_percentage != null && Number(storeSettings.max_wallet_usage_percentage) > 0 
   ? Number(storeSettings.max_wallet_usage_percentage) 
   : 100;
 const maxWalletAllowed = (cartTotal * maxWalletPercentage) / 100;
 const walletApplied = useWallet ? Math.min(walletBalance, maxWalletAllowed, cartTotal) : 0;
 const finalTotal = Math.max(0, cartTotal - walletApplied);

 // Dynamic UPI Details
 const upiId = storeSettings?.upi_id || 'narendrakirana@okaxis';
 const upiPayee = storeSettings?.upi_payee_name || storeSettings?.store_name || 'CartSettle';
 const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayee)}&am=${finalTotal.toFixed(2)}&cu=INR&tn=Order`;
 const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;

 async function submit(customPaypalOrderId = null) { 
  if (isEmergencyPaused) {
    setError(emergencyPauseMsg);
    return;
  }
  if (isClosedHours) {
    setError(operatingHours.message);
    return;
  }
  const hasOutOfStock = (cart?.items || []).some(item => item.is_in_stock === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0));
  if (hasOutOfStock) {
    setError('Some items in your cart are currently out of stock. Please return to your cart and remove them before placing your order.');
    return;
  }
  if (isDeliveryUnderMin) {
    setError(`Minimum delivery order amount is ₹${storeSettings.min_delivery_order_amount}`);
    return;
  }
  if (orderType === 'DELIVERY') {
    if (!selectedAddressId && (!deliveryAddress.trim() || !deliveryPincode.trim())) { 
        setError('Please select or add a delivery address.'); 
        return; 
    }
  }
  if (enableTimeSlots && allTimeSlots.length > 0 && !selectedSlotLabel) {
    setError('Please select a time slot for your order.');
    return;
  }

  setLoading(true); 
  setError(''); 
  try { 
    const isPickup = orderType === 'PICKUP';
    const chosenSlotDate = enableTimeSlots && allTimeSlots.length > 0 ? (slotDay === 'today' ? todayStr : tomorrowStr) : null;
    const chosenSlotLabel = enableTimeSlots && allTimeSlots.length > 0 ? selectedSlotLabel : null;
    const effectivePaymentMethod = finalTotal === 0 ? 'WALLET' : paymentMethod;

    const payload = { 
      pickup_time: chosenSlotLabel || time, 
      customer_note: note, 
      use_wallet: useWallet,
      order_type: orderType,
      delivery_address: isPickup ? '' : deliveryAddress,
      delivery_pincode: isPickup ? '' : deliveryPincode,
      delivery_latitude: isPickup ? null : (() => {
        const lat = selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.latitude : null;
        return (lat != null && lat !== '' && !isNaN(Number(lat))) ? Number(lat) : null;
      })(),
      delivery_longitude: isPickup ? null : (() => {
        const lng = selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.longitude : null;
        return (lng != null && lng !== '' && !isNaN(Number(lng))) ? Number(lng) : null;
      })(),
      delivery_slot_date: chosenSlotDate || null,
      delivery_slot_label: chosenSlotLabel || '',
      payment_method: effectivePaymentMethod,
      upi_transaction_id: effectivePaymentMethod === 'UPI' ? upiTransactionId : ''
    };

    if (payload.order_type === 'DELIVERY' && storeSettings?.enforce_delivery_radius && payload.delivery_latitude && payload.delivery_longitude) {
      const sLat = parseFloat(storeSettings.store_latitude || '17.385044');
      const sLng = parseFloat(storeSettings.store_longitude || '78.486671');
      const maxR = parseFloat(storeSettings.delivery_radius_km || '5.0');
      const dLat = ((payload.delivery_latitude - sLat) * Math.PI) / 180;
      const dLon = ((payload.delivery_longitude - sLng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((sLat * Math.PI) / 180) * Math.cos((payload.delivery_latitude * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist > maxR) {
        setError(`Selected delivery address is ${dist.toFixed(1)} km away, which exceeds our maximum delivery radius of ${maxR.toFixed(1)} km.`);
        setLoading(false);
        return;
      }
    }

    const response = await api.post('/orders/', payload); 
    if (customPaypalOrderId) {
      try {
        await api.post(`/orders/${response.data.id}/authorize_paypal/`, { paypal_order_id: customPaypalOrderId });
      } catch (authErr) {
        console.error('Failed to link PayPal authorization to order:', authErr);
      }
    } 
    if (clearCart) await clearCart().catch(() => {});
    await refresh(); 
    setSuccessOrderId(response.data.id);
    setTimeout(() => {
      navigate(`/orders/${response.data.id}`);
    }, 4000);
  } catch (requestError) { 
    setError(extractErrorMessage(requestError, 'Could not place your order.'));
  } finally { 
    setLoading(false);
  } 
 }

 const isOrderBlocked = isEmergencyPaused || isClosedHours || storeSettings?.is_open === false;

  return (
    <CustomerLayout>
      {successOrderId && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-500 delay-150">
              <Check size={48} className="text-emerald-500" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-ping opacity-20"></div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight text-center px-4 animate-in slide-in-from-bottom-4 duration-500 delay-200">
            Order Placed Successfully!
          </h1>
          <p className="mt-3 text-slate-500 dark:text-slate-400 text-center px-6 animate-in slide-in-from-bottom-4 duration-500 delay-300">
            Thank you for shopping with CartSettle.<br/>We've received your order.
          </p>
          <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500 delay-500">
            <button 
              onClick={() => navigate(`/orders/${successOrderId}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              View Order Details
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-5 sm:py-8 pb-36 md:pb-16">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-transparent border-0 cursor-pointer py-2 px-1"
        >
          <ArrowLeft size={16} /> Back to Cart
        </button>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Checkout</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Review your order details and choose delivery or pickup.</p>

        {/* Emergency Pause Notice */}
        {isEmergencyPaused && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="block font-black uppercase text-[11px] tracking-wider text-amber-800 dark:text-amber-300 mb-0.5">
                Orders Temporarily Paused
              </span>
              {emergencyPauseMsg}
            </div>
          </div>
        )}

        {/* Operating Hours Notice */}
        {isClosedHours && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-start gap-2.5 animate-in fade-in">
            <Clock size={20} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="block font-black uppercase text-[11px] tracking-wider text-rose-800 dark:text-rose-300 mb-0.5">
                Store Outside Operating Hours
              </span>
              {operatingHours.message}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 text-xs sm:text-sm font-bold text-red-700 dark:text-rose-300 animate-in fade-in">
            {error}
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs border border-slate-100 dark:border-slate-800">
          {/* Order Type Toggle */}
          <div className="mb-5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Order Type</label>
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl gap-1.5">
              <button
                type="button"
                onClick={() => setOrderType('PICKUP')}
                className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  orderType === 'PICKUP'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>🏪</span> Store Pickup
              </button>
              <button
                type="button"
                onClick={() => isHomeDeliveryActive ? setOrderType('DELIVERY') : null}
                className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  orderType === 'DELIVERY'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500'
                } ${!isHomeDeliveryActive ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <span>🛵</span> Home Delivery {!isHomeDeliveryActive && '(Unavailable)'}
              </button>
            </div>
          </div>

          {/* Time Slot Selector or Pickup Time */}
          {enableTimeSlots && allTimeSlots.length > 0 ? (
            <div className="mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar size={15} className="text-emerald-600 dark:text-emerald-400" />
                  Select {orderType === 'PICKUP' ? 'Pickup' : 'Delivery'} Time Slot
                </label>
                {storeSettings?.preparation_buffer_minutes > 0 && (
                  <span className="text-[11px] text-slate-400">
                    Prep buffer: {storeSettings.preparation_buffer_minutes}m
                  </span>
                )}
              </div>

              {/* Day Selector (Today / Tomorrow) */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setSlotDay('today')}
                  className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                    slotDay === 'today'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Today ({new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})
                  {todaySlots.length === 0 && <span className="block text-[10px] font-normal opacity-80">(No slots left)</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setSlotDay('tomorrow')}
                  className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                    slotDay === 'tomorrow'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Tomorrow ({tomorrowDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})
                </button>
              </div>

              {/* Slots List */}
              {activeSlotList.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs font-semibold text-amber-800 dark:text-amber-200">
                  All slots for today have closed or passed the preparation buffer. Please choose <button type="button" onClick={() => setSlotDay('tomorrow')} className="font-bold underline text-emerald-700 dark:text-emerald-400">Tomorrow</button>.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeSlotList.map((slot) => {
                    const isSelected = selectedSlotLabel === slot.label;
                    return (
                      <button
                        key={slot.id || slot.label}
                        type="button"
                        onClick={() => {
                          setSelectedSlotLabel(slot.label);
                          setTime(slot.label);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check size={13} className="text-emerald-600 dark:text-emerald-400" />}
                        <span>{slot.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : orderType === 'PICKUP' ? (
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                Pickup time
              </label>
              <select
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
              >
                <option>As soon as possible</option>
                <option>In 30 minutes</option>
                <option>In 1 hour</option>
              </select>
            </div>
          ) : null}

          {/* Delivery Address Section (Home Delivery) */}
          {orderType === 'DELIVERY' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Select Delivery Address
                </label>
                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressForm({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null });
                      setEditingAddressId(null);
                      setShowAddressForm(true);
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    + Add New
                  </button>
                )}
              </div>

              {showAddressForm ? (
                <form onSubmit={saveAddress} className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{editingAddressId ? 'Edit Address' : 'New Address'}</h4>
                    <button type="button" onClick={() => setShowAddressForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">Cancel</button>
                  </div>
                  <div className="space-y-2">
                    {!addressForm.latitude ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button 
                          type="button" 
                          onClick={() => setShowMapPicker(true)} 
                          className="font-extrabold text-xs sm:text-sm py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-2 transition-all border-2 active:scale-[0.98] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-xs"
                        >
                          <MapPin size={16} className="text-emerald-600" />
                          Pin on Map (OSM)
                        </button>
                        <button 
                          type="button" 
                          onClick={captureLocation} 
                          className="font-extrabold text-xs sm:text-sm py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-2 transition-all border-2 active:scale-[0.98] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 cursor-pointer"
                        >
                          <RefreshCw size={14} className="text-slate-500" />
                          Auto GPS
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs sm:text-sm">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span>📍 Pinned ({Number(addressForm.latitude).toFixed(4)}, {Number(addressForm.longitude).toFixed(4)})</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setShowMapPicker(true)} 
                          className="flex items-center gap-1 text-xs font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors shadow-xs active:scale-95 cursor-pointer"
                        >
                          <Edit2 size={12} /> Edit Pin
                        </button>
                      </div>
                    )}
                  </div>

                  <Suspense fallback={<div className="h-48 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse text-sm text-slate-500 font-medium">Loading Map...</div>}>
                    <MapLocationPicker
                    isOpen={showMapPicker}
                    onClose={() => setShowMapPicker(false)}
                    storeSettings={storeSettings}
                    initialLat={addressForm.latitude ? Number(addressForm.latitude) : (storeSettings?.store_latitude ? Number(storeSettings.store_latitude) : 17.385044)}
                    initialLng={addressForm.longitude ? Number(addressForm.longitude) : (storeSettings?.store_longitude ? Number(storeSettings.store_longitude) : 78.486671)}
                    onConfirm={(pin) => {
                      setAddressForm(prev => ({
                        ...prev,
                        latitude: pin.latitude,
                        longitude: pin.longitude,
                        street: pin.street ? (prev.street ? prev.street : pin.street) : prev.street,
                        city: pin.city || prev.city,
                        state: pin.state || prev.state,
                        zip_code: pin.zip_code || prev.zip_code
                      }));
                      toast.success('Doorstep location pinned on map!');
                    }}
                  />
                  </Suspense>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2">
                      <input placeholder="Title (e.g. Home, Office)" value={addressForm.title} onChange={e => setAddressForm({...addressForm, title: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div className="col-span-2">
                      <textarea placeholder="House/Flat No, Street Address *" value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"></textarea>
                    </div>
                    <div className="col-span-2">
                      <input placeholder="Landmark (Optional)" value={addressForm.landmark} onChange={e => setAddressForm({...addressForm, landmark: e.target.value})} className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <input placeholder="City *" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <input placeholder="State *" value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div className="col-span-2">
                      <input placeholder="Pincode *" value={addressForm.zip_code} onChange={e => setAddressForm({...addressForm, zip_code: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full mt-2 bg-indigo-600 text-white font-bold text-xs sm:text-sm py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer">
                    Save Address
                  </button>
                </form>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                  {addresses.length === 0 ? (
                    <div className="p-4 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl text-center text-xs sm:text-sm text-slate-500">
                      No saved addresses found. Please add a delivery address above.
                    </div>
                  ) : (
                    addresses.map(addr => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          selectedAddressId === addr.id
                            ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 dark:border-indigo-500'
                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selectedAddressId === addr.id ? 'border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                          {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">{addr.title}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setAddressForm(addr); setEditingAddressId(addr.id); setShowAddressForm(true); }}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5"
                              title="Edit address"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">{addr.street}</p>
                          {addr.landmark && <p className="text-xs text-slate-500 dark:text-slate-400">{addr.landmark}</p>}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{addr.city}, {addr.state} - {addr.zip_code}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {parseFloat(storeSettings?.min_delivery_order_amount) > 0 && parseFloat(cart?.subtotal) < parseFloat(storeSettings.min_delivery_order_amount) && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 text-xs sm:text-sm font-bold rounded-xl border border-red-100 dark:border-rose-900/50">
                  Home Delivery requires a minimum cart total of ₹{storeSettings.min_delivery_order_amount}.
                </div>
              )}
            </div>
          )}

          {/* Note for the store */}
          <div className="mt-5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Note for the store (optional)
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="E.g., Please pack fragile items carefully..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none h-20"
            />
          </div>

          {/* Payment Method Selection */}
          {finalTotal > 0 && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                Payment Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PAYPAL')}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                    paymentMethod === 'PAYPAL'
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200/70'
                  }`}
                >
                  <span className="absolute -top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                    Recommended
                  </span>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>PayPal</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Auto-Settled on Pack</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'COD'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200/70'
                  }`}
                >
                  <span>💵</span>
                  <span>{orderType === 'DELIVERY' ? 'Cash on Delivery' : 'Pay at Store'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200/70'
                  }`}
                >
                  <QrCode size={16} />
                  <span>UPI / Dynamic QR</span>
                </button>
              </div>

              {/* PayPal Pre-Authorization Widget */}
              {paymentMethod === 'PAYPAL' && (
                <div className="mt-2 mb-2">
                  <PayPalAuthorizeButton
                    amount={finalTotal}
                    onAuthorized={async (paypalOrderId) => {
                      await submit(paypalOrderId);
                    }}
                    disabled={loading || isOrderBlocked}
                  />
                </div>
              )}

              {/* Dynamic UPI Section */}
              {paymentMethod === 'UPI' && (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-xs animate-in fade-in slide-in-from-top-2">
                  {/* Toggle between Dynamic QR & Physical Standee */}
                  {storeSettings?.upi_qr_image && (
                    <div className="flex justify-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setQrViewMode('dynamic')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                          qrViewMode === 'dynamic'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Dynamic QR (₹{finalTotal.toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrViewMode('standee')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                          qrViewMode === 'standee'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Store Standee QR
                      </button>
                    </div>
                  )}

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    {qrViewMode === 'standee' && storeSettings?.upi_qr_image ? (
                      <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 mb-2">
                        <img
                          src={storeSettings.upi_qr_image}
                          alt="Store Standee QR"
                          className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 mb-2 flex items-center justify-center">
                        <QRCodeSVG
                          value={upiUri}
                          size={190}
                          level="M"
                          includeMargin={false}
                          className="w-44 h-44 sm:w-48 sm:h-48"
                        />
                      </div>
                    )}

                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mb-0.5">
                      Scan with any UPI app to pay ₹{finalTotal.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      Google Pay · PhonePe · Paytm · BHIM
                    </p>

                    {/* Copyable UPI ID */}
                    <div className="w-full max-w-xs flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-3">
                      <div className="min-w-0 flex-1 text-left mr-2">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block leading-tight">UPI ID</span>
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate block">{upiId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(upiId);
                          toast.success('UPI ID copied to clipboard!');
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer"
                      >
                        <Copy size={12} /> Copy
                      </button>
                    </div>

                    {/* UPI Reference / UTR Number Input */}
                    <div className="w-full text-left">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        UPI Reference / UTR Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={upiTransactionId}
                        onChange={(e) => setUpiTransactionId(e.target.value.trim())}
                        placeholder="e.g. 423589123456"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Provide your 12-digit transaction UTR for faster payment confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Digital Wallet */}
          {walletBalance > 0 && (
            <div className="mt-5 p-3.5 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">Use Wallet Balance</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Available: ₹{walletBalance.toFixed(2)}</div>
                {maxWalletPercentage < 100 && (
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
                    Up to {maxWalletPercentage}% of order can be paid via wallet (max ₹{maxWalletAllowed.toFixed(2)})
                  </p>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} />
                <div className="w-11 h-6 bg-emerald-200 dark:bg-emerald-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-emerald-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          )}

          {/* Coupons & Offers Section */}
          <div className="mt-5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Tag size={16} />
              </span>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Coupons & Offers</h3>
            </div>

            {cart?.promo_code ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800/60 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 shadow-xs">
                <div>
                  <span className="font-extrabold uppercase tracking-wider text-[10px] block text-emerald-600 dark:text-emerald-400 mb-0.5">Coupon Applied</span>
                  <span className="font-black text-slate-900 dark:text-white">{cart.promo_code}</span>
                  {parseFloat(cart?.promo_discount || 0) > 0 && (
                    <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Saved ₹{parseFloat(cart.promo_discount).toFixed(2)} with this coupon
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-xs font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-xs border border-emerald-200 dark:border-emerald-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      if (promoError) setPromoError('');
                    }}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold uppercase transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!promoInput.trim() || promoApplying}
                    className="rounded-xl bg-slate-900 dark:bg-slate-800 dark:border dark:border-slate-700 px-4 py-2.5 font-bold text-xs sm:text-sm text-white disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-xs active:scale-95 disabled:active:scale-100 cursor-pointer"
                  >
                    {promoApplying ? 'Applying...' : 'Apply'}
                  </button>
                </form>
                {promoError && (
                  <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertCircle size={13} /> {promoError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Order Summary breakdown */}
          <div className="mt-5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
            {discount > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Item MRP Total</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 line-through">₹{mrpTotal.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Product Savings</span>
                <span>- ₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-700 dark:text-slate-200">
              <span className="font-medium">{discount > 0 ? 'Item Subtotal' : 'Subtotal'}</span>
              <span className="font-bold text-slate-900 dark:text-white">₹{itemsTotal.toFixed(2)}</span>
            </div>
            {parseFloat(cart?.promo_discount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Promo Discount</span>
                <span>- ₹{parseFloat(cart.promo_discount).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(cart?.packaging_fee || 0) > 0 && (
              <div className="flex justify-between">
                <span>Packaging Fee</span>
                <span>₹{parseFloat(cart.packaging_fee).toFixed(2)}</span>
              </div>
            )}
            {orderType === 'DELIVERY' && (
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className={deliveryFee === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'font-bold'}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                </span>
              </div>
            )}
            {useWallet && walletApplied > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Wallet Applied</span>
                <span>- ₹{walletApplied.toFixed(2)}</span>
              </div>
            )}
            {(discount > 0 || parseFloat(cart?.promo_discount || 0) > 0) && (
              <div className="py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                <span>🎉 Total Savings on this order:</span>
                <span>₹{(discount + parseFloat(cart?.promo_discount || 0)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base sm:text-lg font-black text-slate-900 dark:text-white pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <span>Total Due</span>
              <span className="text-emerald-700 dark:text-emerald-400">₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Action CTAs */}
          {storeSettings?.is_open === false ? (
            <div className="mt-5 rounded-xl bg-red-50 dark:bg-rose-950/40 p-4 text-center font-bold text-red-700 dark:text-rose-300 border border-red-100 dark:border-rose-900/50 text-xs sm:text-sm">
              The store is currently closed. Cannot place order.
            </div>
          ) : isEmergencyPaused ? (
            <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-4 text-center font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm">
              Online ordering is temporarily paused by the store: {emergencyPauseMsg}
            </div>
          ) : isClosedHours ? (
            <div className="mt-5 rounded-xl bg-rose-50 dark:bg-rose-950/40 p-4 text-center font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm">
              Store Outside Operating Hours: {operatingHours.message}
            </div>
          ) : Number(storeSettings?.min_order_amount) > 0 && itemsTotal < Number(storeSettings.min_order_amount) ? (
            <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-4 text-center font-bold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50 text-xs sm:text-sm">
              Minimum order amount is ₹{storeSettings.min_order_amount}
            </div>
          ) : (
            <>
              {isDeliveryUnderMin && (
                <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-4 text-center font-bold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50 text-xs sm:text-sm">
                  Minimum delivery order amount is ₹{storeSettings.min_delivery_order_amount}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (paymentMethod === 'PAYPAL') {
                    toast('Please click the PayPal button above to authorize payment hold.', { icon: '☝️' });
                    return;
                  }
                  submit();
                }}
                disabled={
                  loading || 
                  isOrderBlocked || 
                  isDeliveryUnderMin || 
                  (orderType === 'DELIVERY' && !selectedAddressId && (!deliveryAddress || !deliveryPincode)) ||
                  (enableTimeSlots && allTimeSlots.length > 0 && !selectedSlotLabel)
                }
                className="mt-6 min-h-[48px] py-3.5 px-6 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] font-extrabold text-white text-sm sm:text-base shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="animate-spin" size={16} /> Placing Order...
                  </span>
                ) : isEmergencyPaused ? (
                  'Ordering Temporarily Paused'
                ) : isClosedHours ? (
                  'Outside Store Operating Hours'
                ) : finalTotal > 0 ? (
                  paymentMethod === 'PAYPAL' ? (
                    'Click the PayPal Button Above to Authorize'
                  ) : paymentMethod === 'UPI' ? (
                    'Place Order (Pay via UPI QR)'
                  ) : orderType === 'DELIVERY' ? (
                    'Place Order (Cash on Delivery)'
                  ) : (
                    'Place Order (Pay at Store)'
                  )
                ) : (
                  'Place Order (Paid via Wallet)'
                )}
              </button>
            </>
          )}
        </div>
      </main>
    </CustomerLayout>
  );
}

export default CheckoutPage;
