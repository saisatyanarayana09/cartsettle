import React, { useEffect, useState, lazy, Suspense } from 'react';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import './order-experience.css';
import PayPalAuthorizeButton from '../../components/PayPalAuthorizeButton';

const MapLocationPicker = lazy(() => import('../../components/MapLocationPicker'));

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, isCustomer, storeSettings, refresh, clearCart, flushCartSync, applyPromo } = useCart();

  const [showBillDrawer, setShowBillDrawer] = useState(false);

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

  // Set default fulfillment method
  useEffect(() => {
    if (storeSettings) {
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
    const hasOutOfStock = (cart?.items || []).some(item => item.is_in_stock === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0));
    if (hasOutOfStock) {
      toast.error('Your cart contains out-of-stock items. Please remove them to proceed.');
      return;
    }

    if (orderType === 'DELIVERY') {
      if (!selectedAddressId && (!deliveryAddress || !deliveryPincode)) {
        toast.error('Please select or add a delivery address.');
        document.getElementById("order-fulfillment")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          document.getElementById("order-fulfillment")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  
  const totalSavings = discount + parseFloat(cart?.promo_discount || 0);

  // Common Your order Breakdown Block
  const OrderSummaryBreakdown = () => {
    const pkgFee = parseFloat(cart?.packaging_fee || packagingFee || 0);
    return (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-semibold text-foreground tabular-nums">
            ₹{mrpTotal.toFixed(2)}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-foreground">
            <span>Savings</span>
            <span className="font-semibold tabular-nums">-₹{discount.toFixed(2)}</span>
          </div>
        )}

        {parseFloat(cart?.promo_discount || 0) > 0 && (
          <div className="flex justify-between text-foreground">
            <span>Coupon</span>
            <span className="font-semibold tabular-nums">-₹{parseFloat(cart.promo_discount).toFixed(2)}</span>
          </div>
        )}

        {pkgFee > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Packaging</span>
            <span className="font-semibold text-foreground tabular-nums">₹{pkgFee.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-muted-foreground">
          <span>Delivery</span>
          <span className="font-semibold text-foreground tabular-nums">
            {deliveryFee === 0 ? <span className="text-foreground">Free</span> : `₹${deliveryFee.toFixed(2)}`}
          </span>
        </div>

        {walletApplied > 0 && (
          <div className="flex justify-between text-foreground">
            <span>Wallet</span>
            <span className="font-semibold tabular-nums">-₹{walletApplied.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm sm:text-base font-extrabold text-foreground pt-2 border-t border-border">
          <span>Total</span>
          <span className="tabular-nums">₹{finalTotal.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  return (
    <CustomerLayout>
      {/* Order Success Full-Screen Modal */}
      {successOrderId && (
        <div className="order-experience fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="size-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Check size={40} className="text-foreground stroke-[3]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-normal text-center">
            Order placed
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground text-center max-w-sm">
            Order #{successOrderId}
          </p>
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            <Button variant="ghost"
              onClick={() => navigate(`/profile/orders`)}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-bold"
            >
              View order
            </Button>
            <Link
              to="/products"
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 rounded-md font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
            >
              Keep shopping
            </Link>
          </div>
        </div>
      )}

      <main className="order-experience order-enter mx-auto w-full max-w-6xl px-4 sm:px-8 pb-36 lg:pb-16">
        <div className="order-heading"><Button variant="ghost" size="icon" onClick={() => navigate('/cart')} aria-label="Back to cart"><ArrowLeft /></Button><h1>Checkout</h1></div>
        {/* Global Warning Banners */}
        {isEmergencyPaused && (
          <div className="mb-3 p-3 rounded-lg bg-muted border border-border text-foreground text-xs font-semibold flex items-start gap-2 shadow-xs">
            <AlertTriangle size={16} className="text-foreground shrink-0 mt-0.5" />
            <div>
              <span className="block font-bold tracking-normal text-[10px] text-foreground">Ordering Paused</span>
              <p>{emergencyPauseMsg}</p>
            </div>
          </div>
        )}

        {isClosedHours && (
          <div className="mb-3 p-3 rounded-lg bg-muted border border-border text-destructive text-xs font-semibold flex items-start gap-2 shadow-xs">
            <Clock size={16} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <span className="block font-bold tracking-normal text-[10px] text-destructive">Store Closed</span>
              <p>{operatingHours.message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-muted border border-border text-destructive text-xs font-semibold flex items-start gap-2">
            <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Expansive 2-Column Desktop Grid */}
        <div className="order-grid">
          {/* Left Column: Progressive Accordion (Steps 1, 2, 3) */}
          <div className="min-w-0">
            {/* STEP 1: FULFILLMENT */}
            <section id="order-fulfillment" className="order-section">
              <header><div className="flex items-center gap-3"><Truck size={20} className="text-muted-foreground" /><h2>Delivery or pickup</h2></div></header>

              {(
                <div className="p-3.5 sm:p-4 pt-2 border-t border-border space-y-3.5 animate-in fade-in duration-200">
                  {/* Delivery vs Pickup Switcher */}
                  <div className="grid grid-cols-2 p-1 rounded-lg bg-muted gap-1">
                    <Button variant="ghost"
                      type="button"
                      onClick={() => {
                        if (!isHomeDeliveryActive) {
                          toast.error('Home delivery is currently unavailable');
                          return;
                        }
                        setOrderType('DELIVERY');
                      }}
                      disabled={!isHomeDeliveryActive}
                      aria-pressed={orderType === 'DELIVERY'}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orderType === 'DELIVERY'
                          ? 'bg-background text-foreground ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground text-muted-foreground disabled:opacity-40'
                      }`}
                    >
                      <Truck size={14} />
                      <span>Delivery</span>
                    </Button>

                    <Button variant="ghost"
                      type="button"
                      onClick={() => setOrderType('PICKUP')}
                      aria-pressed={orderType === 'PICKUP'}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        orderType === 'PICKUP'
                          ? 'bg-background text-foreground ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground text-muted-foreground'
                      }`}
                    >
                      <Store size={14} />
                      <span>Pickup</span>
                    </Button>
                  </div>

                  {orderType === 'DELIVERY' && (
                    <div className="space-y-2.5">
                      {isDeliveryUnderMin && (
                        <p className="p-2.5 rounded-lg bg-muted text-foreground text-xs font-semibold border border-border">
                          Delivery requires a minimum cart total of ₹{storeSettings.min_delivery_order_amount}.
                        </p>
                      )}

                      {/* Delivery address List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-muted-foreground tracking-normal">
                            Delivery address
                          </span>
                          <Button variant="ghost"
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
                            className="inline-flex items-center gap-1 text-xs font-bold text-foreground hover:underline cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>{showNewAddressForm ? 'Cancel' : 'Add New'}</span>
                          </Button>
                        </div>

                        {addresses.length === 0 && !showNewAddressForm && (
                          <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-lg border-border">
                            Add a delivery address.
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
                                tabIndex={0}
                                onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedAddressId(addr.id); setShowNewAddressForm(false); } }}
                                onClick={() => {
                                  setSelectedAddressId(addr.id);
                                  setShowNewAddressForm(false);
                                }}
                                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                                  isSelected
                                    ? 'border-border bg-muted bg-muted ring-1 ring-ring'
                                    : 'border-border border-border hover:border-border bg-muted bg-muted'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-foreground capitalize">{addr.title}</span>
                                    {isSelected && <Check size={14} className="text-foreground stroke-[3]" />}
                                </div>
                                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                                  {[addr.street, addr.landmark, addr.city, addr.zip_code].filter(Boolean).join(', ')}
                                </p>
                              </div>
                              <div className="flex justify-end mt-2 pt-1 border-t border-border">
                                <Button variant="ghost"
                                  type="button"
                                  onClick={(e) => handleDeleteAddress(addr.id, e)}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                  title="Delete address"
                                  aria-label={`Delete ${addr.title} address`}
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {showNewAddressForm && (
                      <form onSubmit={handleSaveAddress} className="p-3.5 rounded-lg bg-muted border border-border space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">New Delivery Address</span>
                          <Button variant="ghost"
                            type="button"
                            onClick={captureLocation}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-foreground font-bold text-[10px] active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <MapPin size={11} /> Pin GPS
                          </Button>
                        </div>

                        <Suspense fallback={<div className="h-40 bg-muted rounded-lg animate-pulse" />}>
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
                            className="col-span-2 h-9 px-3 rounded-lg border border-border bg-muted outline-none focus:border-border"
                          />
                          <textarea
                            placeholder="House/Flat No., Street Address *"
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                            required
                            className="col-span-2 h-14 p-2.5 rounded-lg border border-border bg-muted outline-none focus:border-border resize-none"
                          />
                          <input
                            placeholder="Landmark (Optional)"
                            value={addressForm.landmark}
                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                            className="col-span-2 h-9 px-3 rounded-lg border border-border bg-muted outline-none focus:border-border"
                          />
                          <input
                            placeholder="City *"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            required
                            className="h-9 px-3 rounded-lg border border-border bg-muted outline-none focus:border-border"
                          />
                          <input
                            placeholder="Pincode *"
                            value={addressForm.zip_code}
                            onChange={(e) => setAddressForm({ ...addressForm, zip_code: e.target.value })}
                            required
                            className="h-9 px-3 rounded-lg border border-border bg-muted outline-none focus:border-border"
                          />
                        </div>

                        <Button variant="ghost"
                          type="submit"
                          disabled={loading}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-9 rounded-lg font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-xs"
                        >
                          Save Address
                        </Button>
                      </form>
                    )}
                  </div>
                )}

                {orderType === 'PICKUP' && (
                  <div className="p-3 rounded-lg bg-muted border border-border text-xs">
                    <p className="font-bold text-foreground">Pickup location</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {storeSettings?.store_address || 'Main Store Counter, CartSettle'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* STEP 2: SCHEDULE (if enabled) */}
          {enableTimeSlots && (
            <section id="order-schedule" className="order-section">
              <header><div className="flex items-center gap-3"><Clock size={20} className="text-muted-foreground" /><h2>When</h2></div></header>

              {(
                <div className="p-3.5 sm:p-4 pt-2 border-t border-border space-y-3.5 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 p-1 rounded-lg bg-muted gap-1">
                    <Button variant="ghost"
                      type="button"
                      onClick={() => setSlotDay('today')}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                        slotDay === 'today'
                          ? 'bg-background text-foreground ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground text-muted-foreground'
                      }`}
                    >
                      Today ({new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})
                    </Button>
                    <Button variant="ghost"
                      type="button"
                      onClick={() => setSlotDay('tomorrow')}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                        slotDay === 'tomorrow'
                          ? 'bg-background text-foreground ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground text-muted-foreground'
                      }`}
                    >
                      Tomorrow ({tomorrowDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})
                    </Button>
                  </div>

                  {activeSlotList.length === 0 ? (
                    <p className="p-3 text-center rounded-lg bg-muted text-foreground text-xs font-semibold">
                      All slots for today have closed. Please choose tomorrow.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {activeSlotList.map((slot) => {
                        const isSelected = selectedSlotLabel === slot.label;
                        return (
                          <Button variant="ghost"
                            key={slot.id || slot.label}
                            type="button"
                            onClick={() => {
                              setSelectedSlotLabel(slot.label);
                              setTime(slot.label);
                            }}
                            className={`p-2.5 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted bg-muted border-border border-border text-foreground text-foreground hover:border-border'
                            }`}
                          >
                            {slot.label}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* STEP 3: PAYMENT & WALLET */}
          <section id="order-payment" className="order-section">
            <header><div className="flex items-center gap-3"><Wallet size={20} className="text-muted-foreground" /><h2>Payment</h2></div></header>

            {(
              <div className="p-3.5 sm:p-4 pt-2 border-t border-border space-y-3.5 animate-in fade-in duration-200">
                {/* Wallet Balance Deduction Card */}
                {walletBalance > 0 && (
                  <div className="p-3 rounded-lg bg-muted border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-muted text-foreground grid place-items-center">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">CartSettle Wallet</p>
                        <p className="text-[11px] text-muted-foreground">
                          Balance: ₹{walletBalance.toFixed(2)} {maxWalletPercentage < 100 && `(Max ${maxWalletPercentage}%)`}
                        </p>
                      </div>
                    </div>

                    <Switch aria-label="Use wallet" checked={useWallet} onCheckedChange={setUseWallet} />
                  </div>
                )}

                {/* Segmented Payment Method Selector */}
                {finalTotal > 0 && (
                  <div className="space-y-3">
                    

                    <div className="grid grid-cols-3 p-1 rounded-lg bg-muted gap-1">
                      <Button variant="ghost"
                        type="button"
                        onClick={() => setPaymentMethod('PAYPAL')}
                        aria-pressed={paymentMethod === 'PAYPAL'}
                        className={`h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                          paymentMethod === 'PAYPAL'
                            ? 'bg-background text-foreground ring-1 ring-border'
                            : 'text-muted-foreground hover:text-foreground text-muted-foreground'
                        }`}
                      >
                        <span>PayPal</span>
                      </Button>

                      <Button variant="ghost"
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        aria-pressed={paymentMethod === 'UPI'}
                        className={`h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                          paymentMethod === 'UPI'
                            ? 'bg-background text-foreground ring-1 ring-border'
                            : 'text-muted-foreground hover:text-foreground text-muted-foreground'
                        }`}
                      >
                        <span>UPI</span>
                      </Button>

                      <Button variant="ghost"
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        aria-pressed={paymentMethod === 'COD'}
                        className={`h-10 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                          paymentMethod === 'COD'
                            ? 'bg-background text-foreground ring-1 ring-border'
                            : 'text-muted-foreground hover:text-foreground text-muted-foreground'
                        }`}
                      >
                        <span>{orderType === 'DELIVERY' ? 'Cash' : 'Pay at Store'}</span>
                      </Button>
                    </div>

                    {/* PayPal Pre-Authorization Widget */}
                    {paymentMethod === 'PAYPAL' && (
                      <div className="p-4 rounded-lg bg-muted border border-border text-center animate-in fade-in duration-200">
                        <p className="text-xs text-muted-foreground text-foreground mb-3 font-medium">
                          PayPal holds payment until dispatch.
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
                      <div className="p-4 rounded-lg bg-muted border border-border flex flex-col items-center text-center animate-in fade-in duration-200">
                        <div className="p-3 bg-muted rounded-lg border border-border shadow-xs mb-3">
                          <QRCodeSVG value={upiUri} size={150} level="M" bgColor="var(--primary-foreground)" fgColor="var(--color-vacation-charcoal)" />
                        </div>

                        <p className="text-xs font-bold text-foreground">
                          Scan to pay ₹{finalTotal.toFixed(2)}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
                            {upiId}
                          </span>
                          <Button variant="ghost"
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(upiId);
                              setCopiedUpi(true);
                              setTimeout(() => setCopiedUpi(false), 2000);
                              toast.success('UPI ID copied');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground hover:underline cursor-pointer"
                          >
                            {copiedUpi ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                          </Button>
                        </div>

                        <input
                          placeholder="UPI Transaction ID / UTR (Optional)"
                          value={upiTransactionId}
                          onChange={(e) => setUpiTransactionId(e.target.value)}
                          className="mt-3.5 w-full max-w-xs h-9 px-3 rounded-lg border border-border bg-muted text-xs outline-none focus:border-border"
                        />
                      </div>
                    )}

                    {/* Cash on Delivery Section */}
                    {paymentMethod === 'COD' && (
                      <div className="p-3.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground text-foreground">
                        <p className="font-bold text-foreground">
                          {orderType === 'DELIVERY' ? 'Pay on delivery' : 'Pay at pickup'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {orderType === 'DELIVERY'
                            ? 'Cash or UPI on delivery.'
                            : 'Cash or card at pickup.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <details className="order-optional"><summary>Order note</summary><textarea
                    aria-label="Order note" placeholder="Anything we should know?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full h-14 p-2.5 rounded-lg border border-border bg-muted text-xs outline-none focus:border-border resize-none"
                  /></details>

          {/* Mobile-only Your order & Promo */}
          <div className="lg:hidden space-y-3">
            {/* Promo Code Input Card */}
            <details className="order-optional" open={cart?.applied_promo ? true : undefined}><summary>Coupon</summary>
              {cart?.applied_promo ? (
                <div className="flex items-center justify-between text-xs font-semibold text-foreground bg-muted p-2.5 rounded-lg border border-border">
                  <div className="flex items-center gap-1.5">
                    <Tag size={14} />
                    <span>Promo: {cart.applied_promo} (-₹{parseFloat(cart?.promo_discount || 0).toFixed(2)})</span>
                  </div>
                  <Button variant="ghost"
                    type="button"
                    onClick={handleRemovePromo}
                    disabled={promoApplying}
                    className="text-xs font-bold text-destructive hover:underline cursor-pointer"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    placeholder="Coupon code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    className="min-w-0 flex-1 h-9 px-3 text-xs font-bold tracking-normal rounded-lg border border-border bg-muted outline-none focus:border-border"
                  />
                  <Button variant="ghost"
                    type="submit"
                    disabled={promoApplying || !promoInput.trim()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-lg font-bold text-xs transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {promoApplying ? 'Applying…' : 'Apply'}
                  </Button>
                </form>
              )}
              {promoError && (
                <p className="mt-1 text-[11px] font-bold text-destructive">{promoError}</p>
              )}
            </details>
          </div>
        </div>

        {/* Desktop bill beside checkout fields */}
        <aside className="hidden lg:block order-sidebar">
          {/* Desktop Promo Code Card */}
          <details className="order-optional" open={cart?.applied_promo ? true : undefined}><summary>Coupon</summary>
            {cart?.applied_promo ? (
              <div className="flex items-center justify-between text-xs font-semibold text-foreground bg-muted p-2.5 rounded-lg border border-border">
                <div className="flex items-center gap-1.5">
                  <Tag size={14} />
                  <span>Promo: {cart.applied_promo} (-₹{parseFloat(cart?.promo_discount || 0).toFixed(2)})</span>
                </div>
                <Button variant="ghost"
                  type="button"
                  onClick={handleRemovePromo}
                  disabled={promoApplying}
                  className="text-xs font-bold text-destructive hover:underline cursor-pointer"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  placeholder="Coupon code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="min-w-0 flex-1 h-9 px-3 text-xs font-bold tracking-normal rounded-lg border border-border bg-muted outline-none focus:border-border"
                />
                <Button variant="ghost"
                  type="submit"
                  disabled={promoApplying || !promoInput.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 rounded-lg font-bold text-xs transition-all disabled:opacity-40 cursor-pointer"
                >
                  {promoApplying ? 'Applying…' : 'Apply'}
                </Button>
              </form>
            )}
            {promoError && (
              <p className="mt-1 text-[11px] font-bold text-destructive">{promoError}</p>
            )}
          </details>

          {/* Desktop Your order & Primary CTA */}
          <div className="order-summary space-y-5">
            <h3 className="font-bold text-foreground tracking-normal text-[11px] pb-2 border-b border-border">
              Your order
            </h3>

            <OrderSummaryBreakdown />

            {/* Desktop Action CTA */}
            {storeSettings?.is_open === false ? (
              <div className="w-full py-3 rounded-full bg-muted text-muted-foreground font-bold text-xs text-center">
                Store Closed
              </div>
            ) : isEmergencyPaused ? (
              <div className="w-full py-3 rounded-full bg-muted border border-border text-foreground font-bold text-xs text-center">
                Orders Paused
              </div>
            ) : isClosedHours ? (
              <div className="w-full py-3 rounded-full bg-muted border border-border text-destructive font-bold text-xs text-center">
                Store Closed
              </div>
            ) : (
              <Button variant="ghost"
                type="button"
                onClick={() => {
                  if (paymentMethod === 'PAYPAL' && finalTotal > 0) {
                    document.getElementById("order-payment")?.scrollIntoView({ behavior: "smooth", block: "center" });
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
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 rounded-md font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="animate-spin" size={14} /> Placing order…
                  </span>
                ) : finalTotal > 0 ? (
                  paymentMethod === 'PAYPAL' ? (
                    'Authorize PayPal'
                  ) : paymentMethod === 'UPI' ? (
                    'Place order'
                  ) : orderType === 'DELIVERY' ? (
                    'Place order'
                  ) : (
                    'Place order'
                  )
                ) : (
                  'Place order'
                )}
              </Button>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Sticky Bottom Viewport Dock (lg:hidden) */}
      <aside className="order-dock lg:hidden">
        {showBillDrawer && <div className="order-dock-bill"><OrderSummaryBreakdown /></div>}
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div>
            <Button variant="ghost" className="p-0 h-auto text-muted-foreground text-xs" aria-expanded={showBillDrawer} onClick={() => setShowBillDrawer(value => !value)}>Total <ChevronDown className={showBillDrawer ? "rotate-180" : ""} /></Button>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-foreground tabular-nums tracking-normal">
                ₹{finalTotal.toFixed(2)}
              </span>
              {totalSavings > 0 && (
                <span className="text-[10px] font-bold text-foreground">
                  Saved ₹{totalSavings.toFixed(0)}
                </span>
              )}
            </div>
          </div>

          {storeSettings?.is_open === false ? (
            <div className="px-4 py-2 rounded-full bg-muted text-muted-foreground font-bold text-xs">
              Store Closed
            </div>
          ) : isEmergencyPaused ? (
            <div className="px-4 py-2 rounded-full bg-muted border border-border text-foreground font-bold text-xs">
              Orders Paused
            </div>
          ) : isClosedHours ? (
            <div className="px-4 py-2 rounded-full bg-muted border border-border text-destructive font-bold text-xs">
              Store Closed
            </div>
          ) : (
            <Button variant="ghost"
              type="button"
              onClick={() => {
                if (paymentMethod === 'PAYPAL' && finalTotal > 0) {
                  document.getElementById("order-payment")?.scrollIntoView({ behavior: "smooth", block: "center" });
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-5 sm:px-8 rounded-md font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-[0.98]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="animate-spin" size={14} /> Placing order…
                </span>
              ) : finalTotal > 0 ? (
                paymentMethod === 'PAYPAL' ? (
                  'Authorize PayPal'
                ) : paymentMethod === 'UPI' ? (
                  'Place order'
                ) : orderType === 'DELIVERY' ? (
                  'Place order'
                ) : (
                  'Place order'
                )
              ) : (
                'Place order'
              )}
            </Button>
          )}
        </div>
      </aside>
    </main>
  </CustomerLayout>
);
}

export default CheckoutPage;
