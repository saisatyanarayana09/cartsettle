import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Link, useNavigate } from '../../router';
import { 
  ArrowLeft, 
  MapPin, 
  Trash2, 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  QrCode, 
  RefreshCw, 
  Check, 
  Copy, 
  Tag, 
  ChevronDown, 
  ChevronRight,
  Wallet,
  Truck,
  Store,
  Plus,
  ArrowRight
} from 'lucide-react';
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

  // Accordion active step: 1 (Fulfillment) | 2 (Schedule) | 3 (Payment)
  const [activeStep, setActiveStep] = useState(1);

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  async function handleApplyPromo(e) {
    if (e) e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoError('');
    setPromoApplying(true);
    try {
      await applyPromo(promoInput.trim());
      setPromoInput('');
      toast.success('Promo code applied');
    } catch (err) {
      setPromoError(extractErrorMessage(err) || 'Invalid promo code');
    } finally {
      setPromoApplying(false);
    }
  }

  async function handleRemovePromo() {
    setPromoError('');
    setPromoApplying(true);
    try {
      await applyPromo('');
      toast.success('Promo code removed');
    } catch (err) {
      setPromoError(extractErrorMessage(err) || 'Failed to remove promo code');
    } finally {
      setPromoApplying(false);
    }
  }

  // Core Form State
  const [time, setTime] = useState('As soon as possible');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [orderType, setOrderType] = useState('PICKUP'); // 'PICKUP' | 'DELIVERY'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('PAYPAL'); // 'PAYPAL' | 'COD' | 'UPI'
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [successOrderId, setSuccessOrderId] = useState(null);

  // Address Form State
  const [addressForm, setAddressForm] = useState({
    title: 'Home',
    street: '',
    landmark: '',
    city: '',
    state: '',
    zip_code: '',
    latitude: null,
    longitude: null,
    is_default: false
  });

  // Time Slots
  const enableTimeSlots = Boolean(storeSettings?.enable_time_slots);
  const allTimeSlots = parseTimeSlots(storeSettings?.time_slots_json);
  const bufferMinutes = Number(storeSettings?.preparation_buffer_minutes || 0);
  const [slotDay, setSlotDay] = useState('today');
  const [selectedSlotLabel, setSelectedSlotLabel] = useState('');

  const todaySlots = allTimeSlots.filter(s => !isSlotPassedToday(s, bufferMinutes));
  const tomorrowSlots = allTimeSlots;
  const activeSlotList = slotDay === 'today' ? todaySlots : tomorrowSlots;
  const todayStr = getLocalDateStr(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrowDate);

  useEffect(() => {
    if (enableTimeSlots && activeSlotList.length > 0) {
      const exists = activeSlotList.some(s => s.label === selectedSlotLabel);
      if (!selectedSlotLabel || !exists) {
        setSelectedSlotLabel(activeSlotList[0].label);
        setTime(activeSlotList[0].label);
      }
    }
  }, [enableTimeSlots, slotDay, activeSlotList]);

  // Operating Hours & Constraints
  const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
  const emergencyPauseMsg = storeSettings?.emergency_pause_message || 'Online ordering is temporarily paused by the store.';
  const operatingHours = checkOperatingHours(storeSettings);
  const isClosedHours = operatingHours.isClosed;

  // Fetch initial data
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

  const userPickedOrderType = useRef(false);
  const confirmationRef = useRef(null);

  useEffect(() => {
    if (successOrderId) {
      confirmationRef.current?.focus();
    }
  }, [successOrderId]);

  // Set default fulfillment method
  useEffect(() => {
    if (storeSettings && !userPickedOrderType.current) {
      if (storeSettings.delivery_mode === 'DELIVERY' || storeSettings.is_home_delivery_active) {
        setOrderType('DELIVERY');
      } else {
        setOrderType('PICKUP');
      }
    }
  }, [storeSettings]);

  const handleSaveAddress = async (e) => {
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
      setShowNewAddressForm(false);
      setEditingAddressId(null);
      fetchAddresses();
      toast.success('Address saved');
    } catch (err) {
      toast.error('Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this address?')) return;
    try {
      await api.delete(`/auth/addresses/${id}/`);
      setAddresses(prev => prev.filter(a => a.id !== id));
      if (selectedAddressId === id) setSelectedAddressId(null);
      toast.success('Address deleted');
    } catch {
      toast.error('Could not delete address');
    }
  };

  const captureLocation = () => {
    const loadingToast = toast.loading('Locating doorstep...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAddressForm(prev => ({
            ...prev,
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6))
          }));
          toast.success('Location captured', { id: loadingToast });
        },
        () => {
          toast.error('Could not fetch location. Please check permissions.', { id: loadingToast });
        }
      );
    } else {
      toast.error('Geolocation not supported.', { id: loadingToast });
    }
  };

  // Pricing calculations
  const mrpTotal = parseFloat(cart?.subtotal || 0);
  const discount = parseFloat(cart?.discount || 0);
  const itemsTotal = parseFloat(cart?.items_total || 0) || Math.max(0, mrpTotal - discount);
  const isDeliveryUnderMin = orderType === 'DELIVERY' && parseFloat(storeSettings?.min_delivery_order_amount) > 0 && itemsTotal < parseFloat(storeSettings.min_delivery_order_amount);
  const isHomeDeliveryActive = Boolean(storeSettings?.is_home_delivery_active || storeSettings?.delivery_mode === 'BOTH' || storeSettings?.delivery_mode === 'DELIVERY');

  let deliveryFee = 0;
  if (orderType === 'DELIVERY') {
    if (parseFloat(storeSettings?.free_delivery_threshold) > 0 && itemsTotal >= parseFloat(storeSettings.free_delivery_threshold)) {
      deliveryFee = 0;
    } else {
      deliveryFee = parseFloat(storeSettings?.delivery_fee || 0);
    }
  }

  const packagingFee = parseFloat(cart?.packaging_fee || 0);
  const cartTotal = parseFloat(cart?.total || 0) + deliveryFee;
  const maxWalletPercentage = storeSettings?.max_wallet_usage_percentage != null && Number(storeSettings.max_wallet_usage_percentage) > 0 
    ? Number(storeSettings.max_wallet_usage_percentage) 
    : 100;
  const maxWalletAllowed = (cartTotal * maxWalletPercentage) / 100;
  const walletApplied = useWallet ? Math.min(walletBalance, maxWalletAllowed, cartTotal) : 0;
  const finalTotal = Math.max(0, cartTotal - walletApplied);

  const upiId = storeSettings?.upi_id || 'narendrakirana@okaxis';
  const upiPayee = storeSettings?.upi_payee_name || storeSettings?.store_name || 'CartSettle';
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayee)}&am=${finalTotal.toFixed(2)}&cu=INR&tn=Order`;

  async function submit(customPaypalOrderId = null) {
    if (!cart?.items?.length) return;
    const hasOutOfStock = (cart?.items || []).some(item => item.is_in_stock === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0));
    if (hasOutOfStock) {
      toast.error('Your cart contains out-of-stock items. Please remove them to proceed.');
      return;
    }

    if (orderType === 'DELIVERY') {
      if (!selectedAddressId && (!deliveryAddress || !deliveryPincode)) {
        toast.error('Please select or add a delivery address.');
        setActiveStep(1);
        return;
      }
    }

    setError('');
    setLoading(true);

    try {
      if (flushCartSync) {
        await flushCartSync();
      }

      const isPickup = orderType === 'PICKUP';
      const chosenSlotDate = enableTimeSlots && allTimeSlots.length > 0 ? (slotDay === 'today' ? todayStr : tomorrowStr) : null;
      const chosenSlotLabel = enableTimeSlots && allTimeSlots.length > 0 ? selectedSlotLabel : null;
      const effectivePaymentMethod = finalTotal === 0 ? 'WALLET' : paymentMethod;

      const payload = {
        order_type: orderType,
        delivery_address: isPickup ? 'In-Store Pickup' : deliveryAddress,
        delivery_pincode: isPickup ? '000000' : deliveryPincode,
        delivery_latitude: isPickup ? null : (selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.latitude : addressForm.latitude),
        delivery_longitude: isPickup ? null : (selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.longitude : addressForm.longitude),
        time_slot: chosenSlotLabel || time,
        slot_date: chosenSlotDate,
        customer_notes: note,
        payment_method: effectivePaymentMethod,
        use_wallet: useWallet,
        upi_transaction_id: effectivePaymentMethod === 'UPI' ? upiTransactionId : null,
        paypal_order_id: customPaypalOrderId || null,
      };

      // Delivery radius validation
      if (!isPickup && payload.delivery_latitude && payload.delivery_longitude && storeSettings?.store_latitude && storeSettings?.store_longitude) {
        const sLat = parseFloat(storeSettings.store_latitude);
        const sLng = parseFloat(storeSettings.store_longitude);
        const maxR = parseFloat(storeSettings.delivery_radius_km || '5.0');
        const dLat = ((payload.delivery_latitude - sLat) * Math.PI) / 180;
        const dLon = ((payload.delivery_longitude - sLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((sLat * Math.PI) / 180) * Math.cos((payload.delivery_latitude * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (dist > maxR) {
          setError(`Address is ${dist.toFixed(1)} km away. Store maximum delivery radius is ${maxR} km.`);
          setLoading(false);
          setActiveStep(1);
          return;
        }
      }

      const response = await api.post('/orders/', payload);
      clearCart();
      await refresh();
      toast.success('Order placed successfully');
      setSuccessOrderId(response.data.id);
    } catch (err) {
      console.error('Order submission error:', err);
      setError(extractErrorMessage(err) || 'Could not place your order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isOrderBlocked = isEmergencyPaused || isClosedHours || storeSettings?.is_open === false;
  const selectedAddrObj = addresses.find(a => a.id === selectedAddressId);
  const totalSavings = discount + parseFloat(cart?.promo_discount || 0);

  // Common Order Summary Breakdown Block
  const OrderSummaryBreakdown = () => {
    const pkgFee = parseFloat(cart?.packaging_fee || packagingFee || 0);
    return (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Item MRP Total</span>
          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
            Γé╣{mrpTotal.toFixed(2)}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Store Discount</span>
            <span className="font-semibold tabular-nums">-Γé╣{discount.toFixed(2)}</span>
          </div>
        )}

        {parseFloat(cart?.promo_discount || 0) > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Promo Discount</span>
            <span className="font-semibold tabular-nums">-Γé╣{parseFloat(cart.promo_discount).toFixed(2)}</span>
          </div>
        )}

        {pkgFee > 0 && (
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Packaging & Handling</span>
            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">Γé╣{pkgFee.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>Delivery Fee</span>
          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
            {deliveryFee === 0 ? <span className="text-emerald-600 dark:text-emerald-400">Free</span> : `Γé╣${deliveryFee.toFixed(2)}`}
          </span>
        </div>

        {walletApplied > 0 && (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Wallet Applied</span>
            <span className="font-semibold tabular-nums">-Γé╣{walletApplied.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm sm:text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Total Due</span>
          <span className="tabular-nums">Γé╣{finalTotal.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  if (successOrderId) {
    return (
      <CustomerLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="size-20 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mb-6">
            <Check size={40} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />
          </div>
          <h2 tabIndex={-1} ref={confirmationRef} className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center outline-none">
            Order placed
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
            Your order has been confirmed and forwarded to the store for packing.
          </p>
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => navigate(`/profile/orders`)}
              className="w-full h-12 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm active:scale-95 transition-all shadow-md cursor-pointer"
            >
              View Order Details
            </button>
            <Link
              to="/products"
              className="w-full h-11 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>

      {/* Flush Sticky Top Header */}
      <div className="sticky top-0 z-20 w-full px-4 sm:px-6 lg:px-8 py-2.5 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => navigate('/cart')}
          aria-label="Back to Cart"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs active:scale-95 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
        >
          <ArrowLeft size={14} className="stroke-[2.5]" />
          <span>Back to Cart</span>
        </button>
        
        <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
          Checkout
        </h1>
        
        <div className="w-14" />
      </div>

      <main className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-3 pb-36 lg:pb-16">
        {/* Global Warning Banners */}
        {isEmergencyPaused && (
          <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-start gap-2 shadow-xs">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="block font-bold uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300">Ordering Paused</span>
              <p>{emergencyPauseMsg}</p>
            </div>
          </div>
        )}

        {isClosedHours && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-start gap-2 shadow-xs">
            <Clock size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="block font-bold uppercase tracking-wider text-[10px] text-rose-800 dark:text-rose-300">Store Closed</span>
              <p>{operatingHours.message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Expansive 2-Column Desktop Grid */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          {/* Left Column: Progressive Accordion (Steps 1, 2, 3) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3">
            {/* STEP 1: FULFILLMENT */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs transition-all duration-300">
              <header
                onClick={() => setActiveStep(activeStep === 1 ? 0 : 1)}
                className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`size-6 rounded-full text-xs font-black grid place-items-center transition-colors ${
                    activeStep === 1 ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-emerald-600 text-white'
                  }`}>
                    {activeStep > 1 ? <Check size={13} className="stroke-[3]" /> : '1'}
                  </span>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Fulfillment Method
                    </h2>
                    {activeStep !== 1 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[240px] sm:max-w-md">
                        {orderType === 'DELIVERY'
                          ? selectedAddrObj ? `${selectedAddrObj.title} ┬╖ ${selectedAddrObj.street}` : 'Home Delivery'
                          : 'Store Pickup'}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {activeStep !== 1 && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Edit</span>
                  )}
                  {activeStep === 1 ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </div>
              </header>

              <div className={activeStep === 1 ? "p-3.5 sm:p-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3.5 animate-in fade-in duration-200" : "hidden"}>
                  {/* Delivery vs Pickup Switcher */}
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isHomeDeliveryActive) {
                          toast.error('Home delivery is currently unavailable');
                          return;
                        }
                        userPickedOrderType.current = true;
                        setOrderType('DELIVERY');
                      }}
                      disabled={!isHomeDeliveryActive}
                      aria-label="Delivery"
                      aria-pressed={orderType === 'DELIVERY' ? 'true' : 'false'}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orderType === 'DELIVERY'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 disabled:opacity-40'
                      }`}
                    >
                      <Truck size={14} />
                      <span>Home Delivery</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        userPickedOrderType.current = true;
                        setOrderType('PICKUP');
                      }}
                      aria-label="Pickup"
                      aria-pressed={orderType === 'PICKUP' ? 'true' : 'false'}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orderType === 'PICKUP'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <Store size={14} />
                      <span>Store Pickup</span>
                    </button>
                  </div>

                  {orderType === 'DELIVERY' && (
                    <div className="space-y-2.5">
                      {isDeliveryUnderMin && (
                        <p className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                          Home Delivery requires a minimum cart total of Γé╣{storeSettings.min_delivery_order_amount}.
                        </p>
                      )}

                      {/* Saved Addresses List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Saved Addresses
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAddressId(null);
                              setAddressForm({
                                title: 'Home',
                                street: '',
                                landmark: '',
                                city: '',
                                state: '',
                                zip_code: '',
                                latitude: null,
                                longitude: null,
                                is_default: false
                              });
                              setShowNewAddressForm(!showNewAddressForm);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>{showNewAddressForm ? 'Cancel' : 'Add New'}</span>
                          </button>
                        </div>

                        {addresses.length === 0 && !showNewAddressForm && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                            No saved addresses found. Please add a delivery address.
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {addresses.map((addr) => {
                            const isSelected = selectedAddressId === addr.id;
                            return (
                              <div
                                key={addr.id}
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${addr.title}: ${addr.street}`}
                                onClick={() => {
                                  setSelectedAddressId(addr.id);
                                  setShowNewAddressForm(false);
                                }}
                                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                                  isSelected
                                    ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-600'
                                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 dark:text-white capitalize">{addr.title}</span>
                                    {isSelected && <Check size={14} className="text-emerald-600 stroke-[3]" />}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                                  {[addr.street, addr.landmark, addr.city, addr.zip_code].filter(Boolean).join(', ')}
                                </p>
                              </div>
                              <div className="flex justify-end mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteAddress(addr.id, e)}
                                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                  title="Delete"
                                  aria-label={`Delete ${addr.title} address`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {showNewAddressForm && (
                      <form onSubmit={handleSaveAddress} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">New Delivery Address</span>
                          <button
                            type="button"
                            onClick={captureLocation}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[10px] active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <MapPin size={11} /> Pin GPS
                          </button>
                        </div>

                        <Suspense fallback={<div className="h-40 bg-slate-100 rounded-xl animate-pulse" />}>
                          <MapLocationPicker
                            storeSettings={storeSettings}
                            initialLat={addressForm.latitude ? Number(addressForm.latitude) : 17.385044}
                            initialLng={addressForm.longitude ? Number(addressForm.longitude) : 78.486671}
                            onConfirm={(pin) => {
                              setAddressForm(prev => ({
                                ...prev,
                                latitude: pin.latitude,
                                longitude: pin.longitude,
                                street: pin.street || prev.street,
                                city: pin.city || prev.city,
                                state: pin.state || prev.state,
                                zip_code: pin.zip_code || prev.zip_code
                              }));
                              toast.success('Location pinned on map');
                            }}
                          />
                        </Suspense>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <input
                            placeholder="Address Title (Home, Work)"
                            value={addressForm.title}
                            onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                            required
                            className="col-span-2 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
                          />
                          <textarea
                            placeholder="House/Flat No., Street Address *"
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                            required
                            className="col-span-2 h-14 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600 resize-none"
                          />
                          <input
                            placeholder="Landmark (Optional)"
                            value={addressForm.landmark}
                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                            className="col-span-2 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
                          />
                          <input
                            placeholder="City *"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            required
                            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
                          />
                          <input
                            placeholder="Pincode *"
                            value={addressForm.zip_code}
                            onChange={(e) => setAddressForm({ ...addressForm, zip_code: e.target.value })}
                            required
                            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-emerald-600"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-xs"
                        >
                          Save Address
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {orderType === 'PICKUP' && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">Store Counter Pickup</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {storeSettings?.store_address || 'Main Store Counter, CartSettle'}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      Ready for pickup within 30 minutes of order confirmation.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveStep(enableTimeSlots ? 2 : 3)}
                  className="w-full h-9 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all cursor-pointer"
                >
                  Continue to {enableTimeSlots ? 'Schedule' : 'Payment'}
                </button>
              </div>
            </section>

          {/* STEP 2: SCHEDULE (if enabled) */}
          {enableTimeSlots && (
            <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs transition-all duration-300">
              <header
                onClick={() => setActiveStep(activeStep === 2 ? 0 : 2)}
                className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`size-6 rounded-full text-xs font-black grid place-items-center transition-colors ${
                    activeStep === 2 ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : activeStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {activeStep > 2 ? <Check size={13} className="stroke-[3]" /> : '2'}
                  </span>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Delivery Schedule
                    </h2>
                    {activeStep !== 2 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {slotDay === 'today' ? 'Today' : 'Tomorrow'} ┬╖ {selectedSlotLabel || 'Standard'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeStep !== 2 && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Edit</span>
                  )}
                  {activeStep === 2 ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </div>
              </header>

              <div className={activeStep === 2 ? "p-3.5 sm:p-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3.5 animate-in fade-in duration-200" : "hidden"}>
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 gap-1">
                    <button
                      type="button"
                      onClick={() => setSlotDay('today')}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                        slotDay === 'today'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      Today ({new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotDay('tomorrow')}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                        slotDay === 'tomorrow'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      Tomorrow ({tomorrowDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})
                    </button>
                  </div>

                  {activeSlotList.length === 0 ? (
                    <p className="p-3 text-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                      All slots for today have closed. Please choose tomorrow.
                    </p>
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
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <textarea
                    placeholder="Delivery instructions (e.g. Leave with security, ring doorbell)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full h-14 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:border-emerald-600 resize-none"
                  />

                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="w-full h-9 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all cursor-pointer"
                  >
                    Continue to Payment
                  </button>
                </div>
              </section>
          )}

          {/* STEP 3: PAYMENT & WALLET */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs transition-all duration-300">
            <header
              onClick={() => setActiveStep(activeStep === 3 ? 0 : 3)}
              className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`size-6 rounded-full text-xs font-black grid place-items-center transition-colors ${
                  activeStep === 3 ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {enableTimeSlots ? '3' : '2'}
                </span>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Payment Method
                  </h2>
                  {activeStep !== 3 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {finalTotal === 0
                        ? 'Paid with Wallet'
                        : paymentMethod === 'PAYPAL'
                        ? 'PayPal'
                        : paymentMethod === 'UPI'
                        ? 'UPI / Dynamic QR'
                        : orderType === 'DELIVERY'
                        ? 'Cash on Delivery'
                        : 'Pay at Store'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeStep !== 3 && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Edit</span>
                )}
                {activeStep === 3 ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
              </div>
            </header>

            <div className={activeStep === 3 ? "p-3.5 sm:p-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3.5 animate-in fade-in duration-200" : "hidden"}>
              {/* Wallet Balance Deduction Card */}
                {walletBalance > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">CartSettle Wallet</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Balance: Γé╣{walletBalance.toFixed(2)} {maxWalletPercentage < 100 && `(Max ${maxWalletPercentage}%)`}
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => setUseWallet(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                )}

                {/* Segmented Payment Method Selector */}
                {finalTotal > 0 && (
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Select Payment Option
                    </span>

                    <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 gap-1">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('PAYPAL')}
                        className={`h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                          paymentMethod === 'PAYPAL'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <span>PayPal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                          paymentMethod === 'UPI'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <span>UPI / QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        aria-label={orderType === 'DELIVERY' ? 'Cash' : 'Pay at Store'}
                        className={`h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                          paymentMethod === 'COD'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                      >
                        <span>{orderType === 'DELIVERY' ? 'Cash (COD)' : 'Pay at Store'}</span>
                      </button>
                    </div>

                    {/* PayPal Pre-Authorization Widget */}
                    {paymentMethod === 'PAYPAL' && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center animate-in fade-in duration-200">
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 font-medium">
                          Authorize payment hold with PayPal. Funds are only captured upon dispatch.
                        </p>
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
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center text-center animate-in fade-in duration-200">
                        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs mb-3">
                          <QRCodeSVG value={upiUri} size={150} level="M" />
                        </div>

                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Scan with any UPI app to pay Γé╣{finalTotal.toFixed(2)}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                            {upiId}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(upiId);
                              setCopiedUpi(true);
                              setTimeout(() => setCopiedUpi(false), 2000);
                              toast.success('UPI ID copied');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            {copiedUpi ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        <input
                          placeholder="UPI Transaction ID / UTR (Optional)"
                          value={upiTransactionId}
                          onChange={(e) => setUpiTransactionId(e.target.value)}
                          className="mt-3.5 w-full max-w-xs h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none focus:border-emerald-600"
                        />
                      </div>
                    )}

                    {/* Cash on Delivery Section */}
                    {paymentMethod === 'COD' && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {orderType === 'DELIVERY' ? 'Doorstep Payment' : 'Counter Payment'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {orderType === 'DELIVERY'
                            ? 'You can pay in cash or via UPI QR code directly to the delivery partner upon arrival.'
                            : 'Pay in cash or card at the counter when collecting your order.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

          {/* Mobile-only Order Summary & Promo */}
          <div className="lg:hidden space-y-3">
            {/* Promo Code Input Card */}
            <section className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              {cart?.applied_promo ? (
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-1.5">
                    <Tag size={14} />
                    <span>Promo: {cart.applied_promo} (-Γé╣{parseFloat(cart?.promo_discount || 0).toFixed(2)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    disabled={promoApplying}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    placeholder="Enter Promo Code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    className="flex-1 h-9 px-3 text-xs uppercase font-bold tracking-wider rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-600"
                  />
                  <button
                    type="submit"
                    disabled={promoApplying || !promoInput.trim()}
                    className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {promoApplying ? 'Applying...' : 'Apply'}
                  </button>
                </form>
              )}
              {promoError && (
                <p className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">{promoError}</p>
              )}
            </section>

            {/* Mobile Order Summary */}
            <section className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2 text-xs">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 dark:border-slate-800">
                Order Summary
              </h3>
              <OrderSummaryBreakdown />
            </section>
          </div>
        </div>

        {/* Right Column: Desktop Sticky Order Summary Card (hidden on mobile, sticky on desktop) */}
        <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-16 space-y-3.5">
          {/* Desktop Promo Code Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {cart?.applied_promo ? (
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-1.5">
                  <Tag size={14} />
                  <span>Promo: {cart.applied_promo} (-Γé╣{parseFloat(cart?.promo_discount || 0).toFixed(2)})</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  disabled={promoApplying}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  placeholder="Enter Promo Code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="flex-1 h-9 px-3 text-xs uppercase font-bold tracking-wider rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  disabled={promoApplying || !promoInput.trim()}
                  className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all disabled:opacity-40 cursor-pointer"
                >
                  {promoApplying ? 'Applying...' : 'Apply'}
                </button>
              </form>
            )}
            {promoError && (
              <p className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">{promoError}</p>
            )}
          </div>

          {/* Desktop Order Summary & Primary CTA */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100 dark:border-slate-800">
              Order Summary
            </h3>

            <OrderSummaryBreakdown />

            {/* Desktop Action CTA */}
            {storeSettings?.is_open === false ? (
              <div className="w-full py-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs text-center">
                Store Closed
              </div>
            ) : isEmergencyPaused ? (
              <div className="w-full py-3 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-xs text-center">
                Orders Paused
              </div>
            ) : isClosedHours ? (
              <div className="w-full py-3 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs text-center">
                Store Closed
              </div>
            ) : (
              <button
                type="button"
                aria-label={loading ? 'Placing order…' : (cart?.items?.length > 0 && finalTotal > 0 && paymentMethod === 'PAYPAL' ? 'Authorize PayPal' : 'Place order')}
                onClick={() => {
                  if (paymentMethod === 'PAYPAL' && finalTotal > 0) {
                    toast('Please authorize payment using the PayPal button above.', { icon: 'ℹ️' });
                    setActiveStep(3);
                    return;
                  }
                  submit();
                }}
                disabled={
                  loading || 
                  isOrderBlocked || 
                  !cart?.items?.length ||
                  isDeliveryUnderMin || 
                  (orderType === 'DELIVERY' && !selectedAddressId && (!deliveryAddress || !deliveryPincode)) ||
                  (enableTimeSlots && allTimeSlots.length > 0 && !selectedSlotLabel)
                }
                className="w-full h-11 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="animate-spin" size={14} /> Placing order…
                  </span>
                ) : finalTotal > 0 && cart?.items?.length > 0 ? (
                  paymentMethod === 'PAYPAL' ? (
                    'Authorize PayPal'
                  ) : paymentMethod === 'UPI' ? (
                    'Place Order (UPI)'
                  ) : orderType === 'DELIVERY' ? (
                    'Place Order (COD)'
                  ) : (
                    'Place Order'
                  )
                ) : (
                  'Place Order'
                )}
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Sticky Bottom Viewport Dock (lg:hidden) */}
      <aside className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Due</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                Γé╣{finalTotal.toFixed(2)}
              </span>
              {totalSavings > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Saved Γé╣{totalSavings.toFixed(0)}
                </span>
              )}
            </div>
          </div>

          {storeSettings?.is_open === false ? (
            <div className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs">
              Store Closed
            </div>
          ) : isEmergencyPaused ? (
            <div className="px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-xs">
              Orders Paused
            </div>
          ) : isClosedHours ? (
            <div className="px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs">
              Store Closed
            </div>
          ) : (
            <button
              type="button"
              aria-label={loading ? 'Placing order…' : (cart?.items?.length > 0 && finalTotal > 0 && paymentMethod === 'PAYPAL' ? 'Authorize PayPal' : 'Place order')}
              onClick={() => {
                if (paymentMethod === 'PAYPAL' && finalTotal > 0) {
                  toast('Please authorize payment using the PayPal button above.', { icon: 'ℹ️' });
                  setActiveStep(3);
                  return;
                }
                submit();
              }}
              disabled={
                loading || 
                isOrderBlocked || 
                !cart?.items?.length ||
                isDeliveryUnderMin || 
                (orderType === 'DELIVERY' && !selectedAddressId && (!deliveryAddress || !deliveryPincode)) ||
                (enableTimeSlots && allTimeSlots.length > 0 && !selectedSlotLabel)
              }
              className="h-10 px-6 sm:px-8 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-[0.98]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="animate-spin" size={14} /> Placing order…
                </span>
              ) : finalTotal > 0 && cart?.items?.length > 0 ? (
                paymentMethod === 'PAYPAL' ? (
                  'Authorize PayPal'
                ) : paymentMethod === 'UPI' ? (
                  'Place Order (UPI)'
                ) : orderType === 'DELIVERY' ? (
                  'Place Order (COD)'
                ) : (
                  'Place Order'
                )
              ) : (
                'Place Order'
              )}
            </button>
          )}
        </div>
      </aside>
    </main>
  </CustomerLayout>
);
}

export default CheckoutPage;
