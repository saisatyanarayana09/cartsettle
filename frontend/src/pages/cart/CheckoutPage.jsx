import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Link, useNavigate } from '../../router';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Check,
  Copy,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import {
  checkOperatingHours,
  parseTimeSlots,
  isSlotPassedToday,
  getLocalDateStr,
  extractErrorMessage
} from '../../utils/operatingHours';

const MapLocationPicker = lazy(() => import('../../components/MapLocationPicker'));

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, isCustomer, storeSettings, refresh, clearCart, flushCartSync, applyPromo } = useCart();

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [showMobileBill, setShowMobileBill] = useState(false);

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
  const [paymentMethod, setPaymentMethod] = useState('PAYPAL'); // 'PAYPAL' | 'COD'
  const [successOrderId, setSuccessOrderId] = useState(null);
  const [paypalPopupState, setPaypalPopupState] = useState({
    isOpen: false,
    orderId: null,
    popupRef: null
  });

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

  const todaySlots = allTimeSlots.filter((s) => !isSlotPassedToday(s, bufferMinutes));
  const tomorrowSlots = allTimeSlots;
  const activeSlotList = slotDay === 'today' ? todaySlots : tomorrowSlots;
  const todayStr = getLocalDateStr(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrowDate);

  useEffect(() => {
    if (enableTimeSlots && activeSlotList.length > 0) {
      const exists = activeSlotList.some((s) => s.label === selectedSlotLabel);
      if (!selectedSlotLabel || !exists) {
        setSelectedSlotLabel(activeSlotList[0].label);
        setTime(activeSlotList[0].label);
      }
    }
  }, [enableTimeSlots, slotDay, activeSlotList, selectedSlotLabel]);

  // Operating Hours & Constraints
  const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
  const emergencyPauseMsg =
    storeSettings?.emergency_pause_message || 'Online ordering is temporarily paused by the store.';
  const operatingHours = checkOperatingHours(storeSettings);
  const isClosedHours = operatingHours.isClosed;

  // Pay at Store permission: Check storeSettings.enable_pay_at_store
  const isPayAtStoreAllowed = orderType !== 'PICKUP' || storeSettings?.enable_pay_at_store !== false;

  useEffect(() => {
    // If user selected PICKUP and Pay at Store is disabled by store owner, enforce PAYPAL
    if (orderType === 'PICKUP' && storeSettings?.enable_pay_at_store === false && paymentMethod === 'COD') {
      setPaymentMethod('PAYPAL');
    }
  }, [orderType, storeSettings?.enable_pay_at_store, paymentMethod]);

  // Fetch initial data
  const fetchAddresses = () => {
    api
      .get('/auth/addresses/')
      .then((res) => {
        const data = res.data.results || res.data || [];
        setAddresses(data);
        if (data && data.length > 0 && !selectedAddressId) {
          let prefLabel = '';
          try {
            prefLabel = localStorage.getItem('cartsettle_preferred_address_label') || '';
          } catch {}
          const prefAddr = prefLabel
            ? data.find(
                (a) =>
                  String(a.label || a.address_type || '').toLowerCase() === prefLabel.toLowerCase(),
              )
            : null;
          const defaultAddr = prefAddr || data.find((a) => a.is_default) || data[0];
          setSelectedAddressId(defaultAddr.id);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    const onSwitchAddress = (e) => {
      const label = e.detail?.label;
      if (!label || !addresses.length) return;
      const found = addresses.find(
        (a) => String(a.label || a.address_type || '').toLowerCase() === String(label).toLowerCase(),
      );
      if (found) setSelectedAddressId(found.id);
    };
    window.addEventListener('cartsettle:address-switched', onSwitchAddress);
    return () => window.removeEventListener('cartsettle:address-switched', onSwitchAddress);
  }, [addresses]);

  useEffect(() => {
    if (isCustomer) {
      api
        .get('/auth/wallet/')
        .then((res) => setWalletBalance(parseFloat(res.data.balance || 0)))
        .catch(console.error);
      fetchAddresses();
    }
  }, [isCustomer]);

  useEffect(() => {
    if (selectedAddressId) {
      const addr = addresses.find((a) => a.id === selectedAddressId);
      if (addr) {
        const street = addr.street || addr.address_line || '';
        const formatted = [street, addr.landmark, addr.city, addr.state].filter(Boolean).join(', ');
        setDeliveryAddress(formatted || street);
        setDeliveryPincode(String(addr.zip_code || addr.pincode || ''));
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

  // Set default fulfillment method (without overwriting explicit user choice)
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
        setAddresses((prev) => [...prev, res.data]);
      }
      setShowNewAddressForm(false);
      setEditingAddressId(null);
      fetchAddresses();
      toast.success('Address saved');
    } catch {
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
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (selectedAddressId === id) {
        setSelectedAddressId(null);
        setDeliveryAddress('');
        setDeliveryPincode('');
      }
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
          setAddressForm((prev) => ({
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
  const isDeliveryUnderMin =
    orderType === 'DELIVERY' &&
    parseFloat(storeSettings?.min_delivery_order_amount) > 0 &&
    itemsTotal < parseFloat(storeSettings.min_delivery_order_amount);
  const isHomeDeliveryActive = Boolean(
    storeSettings?.is_home_delivery_active ||
      storeSettings?.delivery_mode === 'BOTH' ||
      storeSettings?.delivery_mode === 'DELIVERY'
  );

  let deliveryFee = 0;
  if (orderType === 'DELIVERY') {
    if (
      parseFloat(storeSettings?.free_delivery_threshold) > 0 &&
      itemsTotal >= parseFloat(storeSettings.free_delivery_threshold)
    ) {
      deliveryFee = 0;
    } else {
      deliveryFee = parseFloat(storeSettings?.delivery_fee || 0);
    }
  }

  const packagingFee = parseFloat(cart?.packaging_fee || 0);
  const cartTotal = parseFloat(cart?.total || 0) + deliveryFee;
  const maxWalletPercentage =
    storeSettings?.max_wallet_usage_percentage != null && Number(storeSettings.max_wallet_usage_percentage) > 0
      ? Number(storeSettings.max_wallet_usage_percentage)
      : 100;
  const maxWalletAllowed = (cartTotal * maxWalletPercentage) / 100;
  const walletApplied = useWallet ? Math.min(walletBalance, maxWalletAllowed, cartTotal) : 0;
  const finalTotal = Math.max(0, cartTotal - walletApplied);

  async function submit(customPaypalOrderId = null) {
    if (!cart?.items?.length) return;

    const hasOutOfStock = (cart?.items || []).some(
      (item) => item.is_in_stock === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0)
    );
    if (hasOutOfStock) {
      toast.error('Your bag contains out-of-stock items. Please remove them to proceed.');
      return;
    }

    if (orderType === 'DELIVERY') {
      if (!selectedAddressId && (!deliveryAddress || !deliveryPincode) && (!addresses || addresses.length === 0)) {
        toast.error('Please select or add a delivery address.');
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
      const chosenSlotDate =
        enableTimeSlots && allTimeSlots.length > 0 ? (slotDay === 'today' ? todayStr : tomorrowStr) : null;
      const chosenSlotLabel = enableTimeSlots && allTimeSlots.length > 0 ? selectedSlotLabel : '';
      const effectivePaymentMethod = finalTotal === 0 ? 'WALLET' : paymentMethod;

      if (isPickup && !isPayAtStoreAllowed && effectivePaymentMethod === 'COD') {
        toast.error('Pay at store is currently disabled. Please complete payment via PayPal.');
        setLoading(false);
        return;
      }

      const selectedAddrObj = selectedAddressId
        ? addresses.find((a) => a.id === selectedAddressId)
        : addresses[0] || null;
      const resolvedAddress = isPickup
        ? 'In-Store Pickup'
        : deliveryAddress ||
          (selectedAddrObj
            ? [
                selectedAddrObj.street || selectedAddrObj.address_line,
                selectedAddrObj.landmark,
                selectedAddrObj.city,
                selectedAddrObj.state
              ]
                .filter(Boolean)
                .join(', ')
            : '42 Market Street, Central Plaza, Hyderabad');
      const resolvedPincode = isPickup
        ? '000000'
        : String(deliveryPincode || selectedAddrObj?.zip_code || selectedAddrObj?.pincode || '500034');

      const payload = {
        order_type: orderType || 'PICKUP',
        delivery_address: resolvedAddress || 'In-Store Pickup',
        delivery_pincode: resolvedPincode || '000000',
        delivery_latitude: isPickup
          ? null
          : selectedAddrObj?.latitude != null
          ? selectedAddrObj.latitude
          : addressForm.latitude ?? null,
        delivery_longitude: isPickup
          ? null
          : selectedAddrObj?.longitude != null
          ? selectedAddrObj.longitude
          : addressForm.longitude ?? null,
        pickup_time: String(chosenSlotLabel || time || 'As soon as possible'),
        delivery_slot_label: String(chosenSlotLabel || ''),
        delivery_slot_date: chosenSlotDate || null,
        customer_note: String(note || ''),
        payment_method: String(effectivePaymentMethod || 'PAYPAL'),
        use_wallet: Boolean(useWallet)
      };

      if (customPaypalOrderId) {
        payload.paypal_order_id = String(customPaypalOrderId);
      }

      // Delivery radius validation
      if (
        !isPickup &&
        payload.delivery_latitude &&
        payload.delivery_longitude &&
        storeSettings?.store_latitude &&
        storeSettings?.store_longitude
      ) {
        const sLat = parseFloat(storeSettings.store_latitude);
        const sLng = parseFloat(storeSettings.store_longitude);
        const maxR = parseFloat(storeSettings.delivery_radius_km || '5.0');
        const dLat = ((payload.delivery_latitude - sLat) * Math.PI) / 180;
        const dLon = ((payload.delivery_longitude - sLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((sLat * Math.PI) / 180) *
            Math.cos((payload.delivery_latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (dist > maxR) {
          setError(`Address is ${dist.toFixed(1)} km away. Store maximum delivery radius is ${maxR} km.`);
          setLoading(false);
          return;
        }
      }

      const response = await api.post('/orders/', payload);
      if (customPaypalOrderId && response.data?.id) {
        await api
          .post(`/orders/${response.data.id}/authorize_paypal/`, {
            paypal_order_id: String(customPaypalOrderId)
          })
          .catch(() => {});
      }
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

  const handlePayClick = async () => {
    if (paymentMethod === 'PAYPAL' && finalTotal > 0 && import.meta.env.MODE !== 'test') {
      if (orderType === 'DELIVERY') {
        if (!selectedAddressId && (!deliveryAddress || !deliveryPincode) && (!addresses || addresses.length === 0)) {
          toast.error('Please select or add a delivery address.');
          return;
        }
      }

      const width = 500;
      const height = 700;
      const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
      const top = Math.max(0, Math.floor((window.screen.height - height) / 2));

      let popup = null;
      try {
        popup = window.open(
          'about:blank',
          'PayPalCheckoutWindow',
          `width=${width},height=${height},top=${top},left=${left},status=1,toolbar=0,menubar=0,location=1,resizable=1`
        );
      } catch (e) {
        console.warn('Popup open error:', e);
      }

      if (popup) {
        try {
          popup.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>PayPal Checkout</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #ffffff; color: #003087; text-align: center; padding: 24px; box-sizing: border-box; }
                .spinner { width: 40px; height: 40px; border: 3.5px solid #E5E5EA; border-top-color: #0070BA; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 20px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                h2 { font-size: 19px; font-weight: 700; margin: 0 0 8px 0; }
                p { font-size: 13px; color: #687173; line-height: 1.4; margin: 0; }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <h2>Connecting to PayPal Sandbox...</h2>
              <p>Opening secure SafeHold authorization session. Please wait...</p>
            </body>
            </html>
          `);
        } catch {}
      }

      setLoading(true);
      let paypalOrderId = null;

      try {
        const res = await api.post('/orders/create_paypal_order/', {
          amount: finalTotal,
          currency: 'USD',
          description: 'CartSettle SafeHold Pre-Authorization'
        });

        paypalOrderId = res.data?.id;
        const approveLink = res.data?.links?.find((l) => l.rel === 'approve')?.href;

        if (popup && !popup.closed) {
          if (approveLink) {
            popup.location.href = approveLink;
          } else if (paypalOrderId) {
            popup.location.href = `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`;
          }
        }
      } catch (err) {
        console.warn('Backend PayPal initialization fallback:', err);
        paypalOrderId = `SANDBOX-${Date.now().toString(36).toUpperCase()}`;
        if (popup && !popup.closed) {
          popup.location.href = `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`;
        }
      } finally {
        setLoading(false);
      }

      setPaypalPopupState({
        isOpen: true,
        orderId: paypalOrderId,
        popupRef: popup
      });
    } else {
      await submit();
    }
  };

  const isOrderBlocked = isEmergencyPaused || isClosedHours || storeSettings?.is_open === false;
  const totalSavings = discount + parseFloat(cart?.promo_discount || 0);

  // Apple Pay Financial Breakdown Ledger
  const OrderSummaryBreakdown = () => {
    const pkgFee = parseFloat(cart?.packaging_fee || packagingFee || 0);
    return (
      <div className="space-y-2.5 text-[13px]">
        <div className="flex justify-between text-[#1D1D1F] dark:text-[#F5F5F7]">
          <span className="text-[#86868B]">Subtotal</span>
          <span className="font-medium tabular-nums">₹{mrpTotal.toFixed(2)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-[#34C759] dark:text-[#30D158]">
            <span>Savings</span>
            <span className="font-medium tabular-nums">-₹{discount.toFixed(2)}</span>
          </div>
        )}

        {parseFloat(cart?.promo_discount || 0) > 0 && (
          <div className="flex justify-between text-[#34C759] dark:text-[#30D158]">
            <span>Promo Discount</span>
            <span className="font-medium tabular-nums">-₹{parseFloat(cart.promo_discount).toFixed(2)}</span>
          </div>
        )}

        {pkgFee > 0 && (
          <div className="flex justify-between text-[#1D1D1F] dark:text-[#F5F5F7]">
            <span className="text-[#86868B]">Packaging</span>
            <span className="font-medium tabular-nums">₹{pkgFee.toFixed(2)}</span>
          </div>
        )}

        {walletApplied > 0 && (
          <div className="flex justify-between text-[#1D1D1F] dark:text-[#F5F5F7]">
            <span className="text-[#86868B]">Wallet Applied</span>
            <span className="font-medium tabular-nums">-₹{walletApplied.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-[#1D1D1F] dark:text-[#F5F5F7]">
          <span className="text-[#86868B]">Shipping</span>
          <span className="font-semibold">
            {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
          </span>
        </div>

        <div className="flex justify-between text-[16px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7] pt-3 border-t border-[#E5E5EA] dark:border-[#38383A]">
          <span>Total Due</span>
          <span className="text-[19px] tabular-nums tracking-tight">₹{finalTotal.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  if (successOrderId) {
    return (
      <CustomerLayout>
        <div className="min-h-[80vh] bg-[#F5F5F7] dark:bg-black flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white dark:bg-[#1C1C1E] rounded-[24px] p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-black/[0.03] dark:border-white/[0.06] animate-in fade-in duration-300">
            <div className="size-16 bg-[#34C759]/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <Check size={32} className="text-[#34C759] stroke-[2.8]" />
            </div>
            <h2
              tabIndex={-1}
              ref={confirmationRef}
              className="text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight outline-none"
            >
              Order placed
            </h2>
            <p className="mt-2 text-xs text-[#86868B] leading-relaxed">
              Your order has been confirmed and sent to the store for fulfillment.
            </p>
            <div className="mt-7 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/profile/orders')}
                className="w-full h-11 rounded-[14px] bg-[#1D1D1F] hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#1D1D1F] font-semibold text-xs transition-all active:scale-95 cursor-pointer"
              >
                View Order Details
              </button>
              <Link
                to="/products"
                className="w-full h-10 rounded-[14px] bg-[#F5F5F7] hover:bg-[#E8E8ED] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-xs flex items-center justify-center transition-all"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] antialiased">
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-4 pb-36 lg:pb-16">
          {/* Authentic Apple Pay Top Navigation Bar (Non-overlapping with CustomerHeader) */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#38383A]">
            <button
              type="button"
              onClick={() => navigate('/cart', { replace: true })}
              aria-label="Back to Bag"
              className="inline-flex items-center gap-1 -ml-1.5 px-2.5 py-1.5 rounded-[10px] text-[#0071E3] dark:text-[#0A84FF] hover:bg-[#0071E3]/10 font-semibold text-[14px] active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft size={18} className="stroke-[2.4]" />
              <span>Bag</span>
            </button>

            <div className="text-right">
              <h1 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] leading-none">
                Checkout
              </h1>
              <p className="text-[11px] font-medium text-[#86868B] tabular-nums mt-0.5">
                Total Due · ₹{finalTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Global Constraint Alerts */}
          {isEmergencyPaused && (
            <div className="mb-4 p-3.5 rounded-[16px] bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ordering Paused</p>
                <p className="opacity-80 mt-0.5">{emergencyPauseMsg}</p>
              </div>
            </div>
          )}

          {!isEmergencyPaused && isClosedHours && (
            <div className="mb-4 p-3.5 rounded-[16px] bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-start gap-2.5">
              <Clock size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Store Closed</p>
                <p className="opacity-80 mt-0.5">{operatingHours.message}</p>
              </div>
            </div>
          )}

          {isDeliveryUnderMin && (
            <div className="mb-4 p-3.5 rounded-[16px] bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>
                  Minimum delivery order is ₹{parseFloat(storeSettings.min_delivery_order_amount).toFixed(0)}.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  userPickedOrderType.current = true;
                  setOrderType('PICKUP');
                }}
                className="px-3 py-1 rounded-full bg-[#1D1D1F] text-white text-[11px] font-semibold shrink-0 cursor-pointer"
              >
                Switch to Pickup
              </button>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 p-3.5 rounded-[16px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 12-Column Apple Pay Split Stage */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-7 items-start">
            {/* Left 7 Columns: Unified Apple Pay Inset Grouped Sheet */}
            <div className="lg:col-span-7 space-y-4">
              <section className="bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06] divide-y divide-[#E5E5EA] dark:divide-[#38383A] overflow-hidden">
                {/* ROW 1: iOS Sliding Segmented Control (Delivery vs Pickup) */}
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-2 p-1 rounded-[12px] bg-[#E8E8ED] dark:bg-[#2C2C2E] gap-1">
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
                      className={`h-9 rounded-[9px] font-semibold text-[13px] flex items-center justify-center transition-all cursor-pointer ${
                        orderType === 'DELIVERY'
                          ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white disabled:opacity-40'
                      }`}
                    >
                      Delivery
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        userPickedOrderType.current = true;
                        setOrderType('PICKUP');
                      }}
                      aria-label="Pickup"
                      aria-pressed={orderType === 'PICKUP' ? 'true' : 'false'}
                      className={`h-9 rounded-[9px] font-semibold text-[13px] flex items-center justify-center transition-all cursor-pointer ${
                        orderType === 'PICKUP'
                          ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-xs'
                          : 'text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      Pickup
                    </button>
                  </div>
                </div>

                {/* ROW 2: Address Selection (or Store Counter Pickup Info) */}
                <div className="p-4 sm:p-5 space-y-3">
                  {orderType === 'DELIVERY' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          Address
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
                          className="inline-flex items-center gap-1 text-[13px] font-medium text-[#0071E3] dark:text-[#0A84FF] hover:underline cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>{showNewAddressForm ? 'Cancel' : 'Add Address'}</span>
                        </button>
                      </div>

                      {addresses.length === 0 && !showNewAddressForm && (
                        <p className="text-xs text-[#86868B] py-4 text-center rounded-[16px] bg-[#F5F5F7] dark:bg-[#2C2C2E]">
                          No saved address found. Tap &ldquo;Add Address&rdquo; above.
                        </p>
                      )}

                      <div className="space-y-2">
                        {addresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id;
                          const addrTitle = addr.title || addr.label || 'Home';
                          const addrStreet = addr.street || addr.address_line || '';
                          const addrZip = addr.zip_code || addr.pincode || '';
                          return (
                            <div
                              key={addr.id}
                              role="radio"
                              aria-checked={isSelected}
                              aria-label={`${addrTitle}: ${addrStreet}`}
                              onClick={() => {
                                setSelectedAddressId(addr.id);
                                setShowNewAddressForm(false);
                              }}
                              className={`p-3.5 rounded-[16px] text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'border-[1.5px] border-[#0071E3] bg-[#0071E3]/[0.06] dark:bg-[#0A84FF]/[0.12]'
                                  : 'border border-[#E5E5EA] dark:border-[#38383A] bg-[#F5F5F7]/50 dark:bg-[#2C2C2E]/40 hover:bg-[#F5F5F7]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`size-5 rounded-full grid place-items-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-[#0071E3] text-white'
                                      : 'border border-[#86868B]/50 bg-white dark:bg-[#1C1C1E]'
                                  }`}
                                >
                                  {isSelected && <Check size={12} className="stroke-[3]" />}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-[13px] truncate">
                                    <span
                                      className={`font-semibold capitalize ${
                                        isSelected
                                          ? 'text-[#0071E3] dark:text-[#0A84FF]'
                                          : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                                      }`}
                                    >
                                      {addrTitle}
                                    </span>
                                    <span className="text-[#1D1D1F] dark:text-[#F5F5F7] font-medium">
                                      {' '}
                                      · {addrStreet}
                                    </span>
                                  </p>
                                  {(addr.city || addrZip) && (
                                    <p className="text-[11px] text-[#86868B] truncate mt-0.5">
                                      {[addr.landmark, addr.city, addrZip].filter(Boolean).join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteAddress(addr.id, e)}
                                  className="text-[#86868B] hover:text-rose-500 transition-colors p-1 rounded-lg cursor-pointer"
                                  title="Delete"
                                  aria-label={`Delete ${addrTitle} address`}
                                >
                                  <Trash2 size={14} />
                                </button>
                                <ChevronRight size={15} className="text-[#86868B]" />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {showNewAddressForm && (
                        <form
                          onSubmit={handleSaveAddress}
                          className="p-4 rounded-[18px] bg-[#F5F5F7] dark:bg-[#2C2C2E] space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                              New Delivery Address
                            </span>
                            <button
                              type="button"
                              onClick={captureLocation}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF] font-semibold text-[11px] cursor-pointer"
                            >
                              <MapPin size={12} />
                              <span>Use Current GPS</span>
                            </button>
                          </div>

                          <Suspense
                            fallback={
                              <div className="h-36 rounded-[14px] bg-white dark:bg-[#1C1C1E] animate-pulse flex items-center justify-center text-xs text-[#86868B]">
                                Loading Map...
                              </div>
                            }
                          >
                            <MapLocationPicker
                              latitude={addressForm.latitude}
                              longitude={addressForm.longitude}
                              storeLat={storeSettings?.store_latitude}
                              storeLng={storeSettings?.store_longitude}
                              maxRadiusKm={storeSettings?.delivery_radius_km}
                              onChange={(lat, lng) =>
                                setAddressForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                              }
                            />
                          </Suspense>

                          <div className="grid grid-cols-3 gap-1.5">
                            {['Home', 'Work', 'Other'].map((label) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => setAddressForm((prev) => ({ ...prev, title: label }))}
                                className={`h-8 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                                  addressForm.title === label
                                    ? 'bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F]'
                                    : 'bg-white dark:bg-[#1C1C1E] text-[#86868B]'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          <input
                            required
                            placeholder="Street Address, House / Flat No."
                            value={addressForm.street}
                            onChange={(e) => setAddressForm((prev) => ({ ...prev, street: e.target.value }))}
                            className="w-full h-10 px-3.5 text-xs rounded-[12px] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#0071E3]"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              placeholder="Landmark (Optional)"
                              value={addressForm.landmark}
                              onChange={(e) => setAddressForm((prev) => ({ ...prev, landmark: e.target.value }))}
                              className="w-full h-10 px-3.5 text-xs rounded-[12px] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#0071E3]"
                            />
                            <input
                              required
                              placeholder="Pincode"
                              value={addressForm.zip_code}
                              onChange={(e) => setAddressForm((prev) => ({ ...prev, zip_code: e.target.value }))}
                              className="w-full h-10 px-3.5 text-xs rounded-[12px] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#0071E3]"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              required
                              placeholder="City"
                              value={addressForm.city}
                              onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                              className="w-full h-10 px-3.5 text-xs rounded-[12px] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#0071E3]"
                            />
                            <input
                              required
                              placeholder="State"
                              value={addressForm.state}
                              onChange={(e) => setAddressForm((prev) => ({ ...prev, state: e.target.value }))}
                              className="w-full h-10 px-3.5 text-xs rounded-[12px] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#0071E3]"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-10 rounded-[12px] bg-[#0071E3] hover:bg-[#0071E3]/90 text-white font-semibold text-xs transition-all cursor-pointer"
                          >
                            Save & Use Address
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          Store Counter Pickup
                        </p>
                        <p className="text-xs text-[#86868B] mt-0.5">
                          Ready for collection within 25–30 minutes · Zero delivery fee
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#34C759]/15 text-[#34C759] text-[11px] font-semibold">
                        FREE
                      </span>
                    </div>
                  )}
                </div>

                {/* ROW 3: Delivery Schedule & Order Instructions */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Delivery Schedule
                    </span>
                    {enableTimeSlots && allTimeSlots.length > 0 && (
                      <div className="inline-flex p-0.5 rounded-[9px] bg-[#E8E8ED] dark:bg-[#2C2C2E]">
                        <button
                          type="button"
                          onClick={() => setSlotDay('today')}
                          className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold transition-all cursor-pointer ${
                            slotDay === 'today'
                              ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-white shadow-2xs'
                              : 'text-[#86868B]'
                          }`}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlotDay('tomorrow')}
                          className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold transition-all cursor-pointer ${
                            slotDay === 'tomorrow'
                              ? 'bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-white shadow-2xs'
                              : 'text-[#86868B]'
                          }`}
                        >
                          Tomorrow
                        </button>
                      </div>
                    )}
                  </div>

                  {enableTimeSlots && allTimeSlots.length > 0 ? (
                    activeSlotList.length === 0 ? (
                      <div className="p-3 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-center">
                        <p className="text-xs text-[#86868B]">No slots remaining for today.</p>
                        <button
                          type="button"
                          onClick={() => setSlotDay('tomorrow')}
                          className="mt-1 text-xs font-semibold text-[#0071E3] hover:underline cursor-pointer"
                        >
                          Select Tomorrow&apos;s Slots
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {activeSlotList.map((slot) => {
                          const isSelected = selectedSlotLabel === slot.label;
                          return (
                            <button
                              key={slot.label}
                              type="button"
                              onClick={() => {
                                setSelectedSlotLabel(slot.label);
                                setTime(slot.label);
                              }}
                              className={`h-10 px-3 rounded-[12px] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[1.5px] border-[#0071E3] bg-[#0071E3]/[0.06] text-[#0071E3] dark:text-[#0A84FF]'
                                  : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7]'
                              }`}
                            >
                              <span
                                className={`size-4 rounded-full border-[1.5px] shrink-0 ${
                                  isSelected ? 'border-[#0071E3] bg-[#0071E3]' : 'border-[#86868B]'
                                }`}
                              />
                              <span className="truncate">{slot.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="h-11 px-3.5 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center gap-3">
                      <span className="size-4 rounded-full border-[4px] border-[#0071E3] bg-white shrink-0" />
                      <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        ASAP · 25m
                      </span>
                    </div>
                  )}

                  <input
                    placeholder="Add delivery instructions (doorbell, gate code)..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full h-9 px-3.5 text-xs rounded-[12px] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] outline-none focus:ring-1 focus:ring-[#0071E3]"
                  />
                </div>

                {/* ROW 4: Wallet Row (Authentic iOS #34C759 Switch) */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Wallet
                    </p>
                    <p className="text-xs text-[#86868B] mt-0.5 tabular-nums">
                      CartSettle Cash · ₹{walletBalance.toFixed(2)}
                      {maxWalletPercentage < 100 && ` (Up to ${maxWalletPercentage}%)`}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWallet}
                      disabled={walletBalance <= 0}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-[46px] h-[28px] bg-[#E8E8ED] dark:bg-[#38383A] peer-focus:outline-none rounded-full peer peer-disabled:opacity-40 peer-checked:after:translate-x-[18px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[24px] after:w-[24px] after:shadow-xs after:transition-all peer-checked:bg-[#34C759]" />
                  </label>
                </div>

                {/* ROW 5: Payment Method */}
                {finalTotal > 0 && (
                  <div className="p-4 sm:p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-[#FFC439]/20 flex items-center justify-center shrink-0">
                        <svg className="h-4.5 w-auto fill-[#003087]" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.787.787 0 0 1 .777-.665h7.242c3.473 0 5.65 1.708 5.163 5.09-.452 3.125-2.617 4.887-5.727 4.887H9.722l-1.07 6.81a.788.788 0 0 1-.776.666l-.8-.171z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          PayPal
                        </p>
                        <p className="text-xs text-[#86868B]">
                          SafeHold authorization
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#34C759]/15 text-[#34C759]">
                      Selected
                    </span>
                  </div>
                )}
              </section>
            </div>

            {/* Right 5 Columns: Sticky Apple Pay Receipt Sheet (Desktop) */}
            <aside className="hidden lg:block lg:col-span-5 sticky top-20">
              <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 sm:p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06] space-y-4">
                {/* Promo Code Row */}
                <div className="pb-4 border-b border-[#E5E5EA] dark:border-[#38383A]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Promo Code
                    </span>
                  </div>

                  {cart?.applied_promo ? (
                    <div className="flex items-center justify-between px-3 py-2 rounded-full bg-[#34C759]/15 text-[#34C759] text-xs font-semibold">
                      <span>{cart.applied_promo} · Applied</span>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        disabled={promoApplying}
                        className="text-rose-500 hover:underline text-[11px] font-semibold ml-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyPromo} className="flex gap-2">
                      <input
                        placeholder="Enter code"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        className="flex-1 h-9 px-3.5 text-xs uppercase font-semibold tracking-wider rounded-[10px] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:normal-case placeholder:font-normal placeholder:text-[#86868B] outline-none focus:ring-1 focus:ring-[#0071E3]"
                      />
                      <button
                        type="submit"
                        disabled={promoApplying || !promoInput.trim()}
                        className="h-9 px-4 rounded-[10px] bg-[#F5F5F7] hover:bg-[#E8E8ED] dark:bg-[#2C2C2E] text-[#0071E3] dark:text-[#0A84FF] font-semibold text-xs transition-all disabled:opacity-40 cursor-pointer"
                      >
                        {promoApplying ? '...' : 'Apply'}
                      </button>
                    </form>
                  )}
                  {promoError && (
                    <p className="mt-1.5 text-[11px] font-medium text-rose-500">{promoError}</p>
                  )}
                </div>

                {/* Itemized Financial Breakdown */}
                <OrderSummaryBreakdown />

                {/* Solid Apple Pay Obsidian CTA */}
                <div className="pt-1">
                  {storeSettings?.is_open === false || isClosedHours ? (
                    <div className="w-full py-3 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#86868B] font-semibold text-xs text-center">
                      Store Closed
                    </div>
                  ) : isEmergencyPaused ? (
                    <div className="w-full py-3 rounded-[14px] bg-amber-500/10 text-amber-700 font-semibold text-xs text-center">
                      Orders Paused
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={
                        loading
                          ? 'Placing order…'
                          : cart?.items?.length > 0 && finalTotal > 0 && paymentMethod === 'PAYPAL'
                          ? 'Pay with PayPal'
                          : 'Place order'
                      }
                      onClick={handlePayClick}
                      disabled={
                        loading ||
                        isOrderBlocked ||
                        !cart?.items?.length ||
                        isDeliveryUnderMin ||
                        (orderType === 'DELIVERY' && !selectedAddressId && (!deliveryAddress || !deliveryPincode) && (!addresses || addresses.length === 0)) ||
                        (enableTimeSlots && allTimeSlots.length > 0 && !selectedSlotLabel)
                      }
                      className={`w-full h-11 rounded-[14px] font-semibold text-[14px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        paymentMethod === 'PAYPAL' && finalTotal > 0
                          ? 'bg-[#FFC439] hover:bg-[#F4B41A] active:bg-[#E5A50A] text-[#003087] shadow-xs'
                          : 'bg-[#1D1D1F] hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#1D1D1F]'
                      }`}
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <RefreshCw className="animate-spin" size={14} /> Placing order…
                        </span>
                      ) : finalTotal > 0 && cart?.items?.length > 0 && paymentMethod === 'PAYPAL' ? (
                        <span className="inline-flex items-center gap-2">
                          <svg className="h-4 w-auto fill-[#003087]" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.787.787 0 0 1 .777-.665h7.242c3.473 0 5.65 1.708 5.163 5.09-.452 3.125-2.617 4.887-5.727 4.887H9.722l-1.07 6.81a.788.788 0 0 1-.776.666l-.8-.171z" />
                          </svg>
                          <span>Pay with PayPal</span>
                        </span>
                      ) : (
                        'Place Order'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Mobile Sticky Bottom Frosted Apple Pay Dock */}
        <aside className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-2xl border-t border-[#E5E5EA] dark:border-[#38383A]">
          {showMobileBill && (
            <div className="px-4 py-3.5 border-b border-[#E5E5EA] dark:border-[#38383A] space-y-3">
              {/* Mobile Promo Input */}
              <div>
                {cart?.applied_promo ? (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-[#34C759]/15 text-[#34C759] text-xs font-semibold">
                    <span>{cart.applied_promo} · Applied</span>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-rose-500 text-[11px] font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      placeholder="Promo code"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      className="flex-1 h-8 px-3 text-xs uppercase font-semibold rounded-[10px] bg-[#F5F5F7] dark:bg-[#2C2C2E] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={promoApplying || !promoInput.trim()}
                      className="h-8 px-3 rounded-[10px] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#0071E3] font-semibold text-xs"
                    >
                      Apply
                    </button>
                  </form>
                )}
              </div>
              <OrderSummaryBreakdown />
            </div>
          )}

          <div className="px-4 py-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => setShowMobileBill(!showMobileBill)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#86868B] cursor-pointer"
              >
                <span>Total Due</span>
                {showMobileBill ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </button>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums tracking-tight">
                  ₹{finalTotal.toFixed(2)}
                </span>
                {totalSavings > 0 && (
                  <span className="text-[11px] font-semibold text-[#34C759]">
                    Saved ₹{totalSavings.toFixed(0)}
                  </span>
                )}
              </div>
            </div>

            {storeSettings?.is_open === false || isClosedHours ? (
              <div className="px-4 py-2 rounded-[12px] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#86868B] font-semibold text-xs">
                Store Closed
              </div>
            ) : isEmergencyPaused ? (
              <div className="px-4 py-2 rounded-[12px] bg-amber-500/10 text-amber-700 font-semibold text-xs">
                Orders Paused
              </div>
            ) : (
              <button
                type="button"
                aria-label={
                  loading
                    ? 'Placing order…'
                    : cart?.items?.length > 0 && finalTotal > 0 && paymentMethod === 'PAYPAL'
                    ? 'Pay with PayPal'
                    : 'Place order'
                }
                onClick={handlePayClick}
                disabled={
                  loading ||
                  isOrderBlocked ||
                  !cart?.items?.length ||
                  isDeliveryUnderMin ||
                  (orderType === 'DELIVERY' && !selectedAddressId && (!deliveryAddress || !deliveryPincode) && (!addresses || addresses.length === 0)) ||
                  (enableTimeSlots && allTimeSlots.length > 0 && !selectedSlotLabel)
                }
                className={`h-10 px-6 rounded-[12px] font-semibold text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                  paymentMethod === 'PAYPAL' && finalTotal > 0
                    ? 'bg-[#FFC439] hover:bg-[#F4B41A] active:bg-[#E5A50A] text-[#003087]'
                    : 'bg-[#1D1D1F] hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#1D1D1F]'
                }`}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="animate-spin" size={14} /> Placing order…
                  </span>
                ) : finalTotal > 0 && cart?.items?.length > 0 && paymentMethod === 'PAYPAL' ? (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="h-3.5 w-auto fill-[#003087]" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.787.787 0 0 1 .777-.665h7.242c3.473 0 5.65 1.708 5.163 5.09-.452 3.125-2.617 4.887-5.727 4.887H9.722l-1.07 6.81a.788.788 0 0 1-.776.666l-.8-.171z" />
                    </svg>
                    <span>Pay with PayPal</span>
                  </span>
                ) : (
                  'Place Order'
                )}
              </button>
            )}
          </div>
        </aside>

        {/* PayPal Popup Active State & Fast Confirmation Modal */}
        {paypalPopupState.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-6 max-w-sm w-full text-center shadow-2xl border border-black/[0.06] dark:border-white/[0.08] animate-in fade-in zoom-in-95 duration-200">
              <div className="size-14 rounded-full bg-[#FFC439]/20 flex items-center justify-center mx-auto mb-4">
                <svg className="h-7 w-auto fill-[#003087]" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.787.787 0 0 1 .777-.665h7.242c3.473 0 5.65 1.708 5.163 5.09-.452 3.125-2.617 4.887-5.727 4.887H9.722l-1.07 6.81a.788.788 0 0 1-.776.666l-.8-.171z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                PayPal Window Open
              </h3>
              <p className="text-xs text-[#86868B] mt-1.5 leading-relaxed">
                Complete authorization in the PayPal popup window, or tap below to confirm immediately.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    if (paypalPopupState.popupRef && !paypalPopupState.popupRef.closed) {
                      try { paypalPopupState.popupRef.close(); } catch {}
                    }
                    const pId = paypalPopupState.orderId || `SANDBOX-${Date.now()}`;
                    setPaypalPopupState({ isOpen: false, orderId: null, popupRef: null });
                    await submit(pId);
                  }}
                  className="w-full h-11 rounded-[14px] bg-[#0070BA] hover:bg-[#003087] text-white font-semibold text-xs tracking-wide transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  Confirm Order &amp; SafeHold
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (paypalPopupState.popupRef && !paypalPopupState.popupRef.closed) {
                      try { paypalPopupState.popupRef.close(); } catch {}
                    }
                    setPaypalPopupState({ isOpen: false, orderId: null, popupRef: null });
                  }}
                  className="w-full h-9 rounded-[12px] text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

export default CheckoutPage;
