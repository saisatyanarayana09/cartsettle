import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from '../../router';
import {
  ChevronLeft,
  Package,
  PackageSearch,
  Truck,
  Store,
  XCircle,
  CheckCircle2,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import { useWebSocket } from '../../hooks/useWebSocket';

const OrderTrackingMap = lazy(() => import('../../components/OrderTrackingMap'));

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { storeSettings } = useCart();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const fetchOrder = useCallback(
    (silent = false) => {
      return api
        .get(`/orders/${id}/`, { params: { t: Date.now() } })
        .then((response) => {
          setOrder(response.data);
          setError('');
        })
        .catch(() => {
          if (!silent) setError('Could not load this order.');
        });
    },
    [id]
  );

  const handleWsMessage = useCallback((data) => {
    if (!data || !data.type) return;

    if (data.type === 'INITIAL_STATE' && data.order) {
      setOrder((prev) => ({ ...(prev || {}), ...data.order }));
    } else if (data.type === 'ORDER_STATUS_UPDATE') {
      const formattedStatus = String(data.status || '')
        .toLowerCase()
        .replace(/_/g, ' ');
      toast.success(`Order status updated to ${formattedStatus}`);
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: data.status,
          delivery_otp: data.delivery_otp || prev.delivery_otp,
          updated_at: data.updated_at || new Date().toISOString()
        };
      });
    } else if (data.type === 'RIDER_LOCATION_UPDATE') {
      const latNum = parseFloat(data.latitude);
      const lngNum = parseFloat(data.longitude);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setOrder((prev) => {
          if (!prev) return prev;
          const currentPartner = prev.delivery_partner || {};
          return {
            ...prev,
            delivery_partner_lat: latNum,
            delivery_partner_lng: lngNum,
            delivery_partner: {
              ...currentPartner,
              current_lat: latNum,
              current_lng: lngNum,
              heading: data.heading,
              speed: data.speed
            }
          };
        });
      }
    }
  }, []);

  const { isConnected: isWsConnected } = useWebSocket({
    path: `/ws/orders/${id}/tracking/`,
    enabled: Boolean(id),
    onMessage: handleWsMessage
  });

  useEffect(() => {
    fetchOrder();
    const pollInterval = isWsConnected ? 30000 : 8000;
    const intervalId = setInterval(() => {
      if (!document.hidden) fetchOrder(true);
    }, pollInterval);
    return () => clearInterval(intervalId);
  }, [fetchOrder, isWsConnected]);

  const statusRankMap = {
    NEW: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY: 3,
    OUT_FOR_DELIVERY: 4,
    COMPLETED: 5
  };

  const getSteps = (type = 'DELIVERY') => [
    { id: 'NEW', rank: 0, label: 'Order Placed', desc: 'Received by store', icon: CheckCircle2 },
    { id: 'ACCEPTED', rank: 1, label: 'Accepted', desc: 'Confirmed by store', icon: CheckCircle2 },
    { id: 'PREPARING', rank: 2, label: 'Packing', desc: 'Items being packed', icon: PackageSearch },
    {
      id: 'READY',
      rank: 3,
      label: type === 'DELIVERY' ? 'Ready for Rider' : 'Ready for Pickup',
      desc: type === 'DELIVERY' ? 'Packed and awaiting dispatch' : 'Ready at counter',
      icon: type === 'DELIVERY' ? Package : Store
    },
    ...(type === 'DELIVERY'
      ? [{ id: 'OUT_FOR_DELIVERY', rank: 4, label: 'On the Way', desc: 'Rider en route to you', icon: Truck }]
      : []),
    {
      id: 'COMPLETED',
      rank: 5,
      label: type === 'DELIVERY' ? 'Delivered' : 'Completed',
      desc: type === 'DELIVERY' ? 'Delivered to doorstep' : 'Picked up at store',
      icon: CheckCircle2
    }
  ];

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] antialiased">
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-4 pb-28 md:pb-16">
          {/* Apple HIG Top Navigation Bar */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#38383A]">
            <button
              type="button"
              onClick={() => navigate('/profile/orders')}
              aria-label="Back to Orders"
              className="inline-flex items-center gap-1 -ml-1.5 px-2.5 py-1.5 rounded-[10px] text-[#0071E3] dark:text-[#0A84FF] hover:bg-[#0071E3]/10 font-semibold text-[14px] active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft size={18} className="stroke-[2.4]" />
              <span>Orders</span>
            </button>

            <div className="flex items-center gap-2.5">
              {order?.status === 'COMPLETED' && (
                <Link
                  to={`/orders/${order.id}/invoice`}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[10px] bg-[#1D1D1F] hover:bg-black/85 dark:bg-white text-white dark:text-[#1D1D1F] text-xs font-semibold transition-all"
                >
                  <FileText size={13} />
                  <span>Invoice</span>
                </Link>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-[16px] bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {!order && !error && (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-8 text-center text-xs text-[#86868B] animate-pulse">
              Loading order details...
            </div>
          )}

          {order && (
            <div className="lg:grid lg:grid-cols-12 lg:gap-7 items-start space-y-5 lg:space-y-0">
              {/* Left 7 Columns: Order Status Timeline, Live Map & Items */}
              <div className="lg:col-span-7 space-y-4">
                {/* Order Header & Status Sheet */}
                <section className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06] space-y-4">
                  <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#E5E5EA] dark:border-[#38383A]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Order Confirmed'}
                      </p>
                      <h1 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight mt-0.5">
                        {order.id}
                      </h1>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        order.status === 'COMPLETED'
                          ? 'bg-[#34C759]/15 text-[#34C759]'
                          : order.status === 'REJECTED'
                          ? 'bg-rose-500/12 text-rose-600'
                          : 'bg-[#0071E3]/12 text-[#0071E3] dark:text-[#0A84FF]'
                      }`}
                    >
                      {String(order.status || 'NEW').replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Delivery OTP Banner */}
                  {order.order_type === 'DELIVERY' && order.delivery_otp && order.status !== 'COMPLETED' && (
                    <div className="p-3.5 rounded-[16px] bg-[#34C759]/10 border border-[#34C759]/25 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          Delivery Verification PIN
                        </p>
                        <p className="text-[11px] text-[#86868B] mt-0.5">
                          Share this code with your rider at the doorstep
                          {order.delivery_partner_name ? ` · ${order.delivery_partner_name}` : ''}
                        </p>
                      </div>
                      <div className="px-3.5 py-1.5 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-[#34C759]/40 font-mono text-lg font-bold tracking-widest text-[#34C759] shrink-0">
                        {order.delivery_otp}
                      </div>
                    </div>
                  )}

                  {/* Tracking Steps */}
                  {order.status === 'REJECTED' ? (
                    <div className="flex items-center gap-3 p-3.5 rounded-[16px] bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
                      <XCircle size={20} className="shrink-0" />
                      <div>
                        <p className="font-semibold">Order Cancelled</p>
                        <p className="opacity-85 mt-0.5">
                          This order was cancelled and any wallet or authorized balance has been released.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-1 pt-1">
                      <div className="space-y-3.5 relative">
                        {getSteps(order.order_type).map((step) => {
                          const currentRank = statusRankMap[order.status] ?? 0;
                          const isCompleted = currentRank >= step.rank;
                          const isActive = currentRank === step.rank;
                          const Icon = step.icon || CheckCircle2;

                          return (
                            <div
                              key={step.id}
                              className={`flex items-center gap-3 ${!isCompleted ? 'opacity-40' : ''}`}
                            >
                              <div
                                className={`size-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                  isCompleted
                                    ? isActive
                                      ? 'bg-[#0071E3] text-white ring-4 ring-[#0071E3]/15'
                                      : 'bg-[#34C759] text-white'
                                    : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#86868B]'
                                }`}
                              >
                                <Icon size={15} strokeWidth={2.3} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-xs font-semibold ${
                                    isActive
                                      ? 'text-[#0071E3] dark:text-[#0A84FF]'
                                      : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                                  }`}
                                >
                                  {step.label}
                                </p>
                                <p className="text-[11px] text-[#86868B]">{step.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>

                {/* Live OpenStreetMap Delivery Route */}
                {order.order_type === 'DELIVERY' && (
                  <section className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-4 sm:p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={15} className="text-[#0071E3]" />
                      <h2 className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Live Delivery Route
                      </h2>
                    </div>
                    <div className="rounded-[16px] overflow-hidden relative z-0 isolate">
                      <Suspense
                        fallback={
                          <div className="h-52 flex items-center justify-center bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-[16px] animate-pulse text-xs text-[#86868B]">
                            Loading route map...
                          </div>
                        }
                      >
                        <OrderTrackingMap order={order} storeSettings={storeSettings} />
                      </Suspense>
                    </div>
                  </section>
                )}

                {/* Order Items Apple Inset Sheet */}
                <section className="bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#E5E5EA] dark:border-[#38383A] flex items-center justify-between">
                    <h2 className="text-[14px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Items in Order
                    </h2>
                    <span className="text-xs text-[#86868B] tabular-nums">
                      {(order.items || []).length} {(order.items || []).length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <div className="divide-y divide-[#E5E5EA] dark:divide-[#38383A]">
                    {(order.items || []).map((item) => (
                      <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-10 rounded-[10px] bg-[#F5F5F7] dark:bg-[#2C2C2E] shrink-0 overflow-hidden flex items-center justify-center p-1">
                            {item.product_image ? (
                              <img
                                src={item.product_image}
                                alt=""
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <Package size={15} className="text-[#86868B]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`font-semibold truncate ${
                                item.status === 'REJECTED'
                                  ? 'line-through text-[#86868B]'
                                  : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                              }`}
                            >
                              {item.product_name_snapshot || item.product_name}
                            </p>
                            <p className="text-[11px] text-[#86868B] mt-0.5">
                              Qty: {item.quantity} {item.unit_snapshot ? `· ${item.unit_snapshot}` : ''}
                              {item.status === 'REJECTED' && (
                                <span className="ml-2 text-rose-500 font-semibold">Unavailable</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`font-semibold tabular-nums shrink-0 ${
                            item.status === 'REJECTED'
                              ? 'line-through text-[#86868B]'
                              : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                          }`}
                        >
                          ₹{parseFloat(item.subtotal || item.price || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Right 5 Columns: Sticky Apple Pay Receipt & Settlement Summary */}
              <aside className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
                {/* PayPal Dynamic Settlement Card */}
                {(order.paypal_authorization_id || order.payment_method === 'PAYPAL') && (
                  <section className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] dark:border-[#38383A]">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-[9px] bg-[#0071E3]/10 text-[#0071E3] grid place-items-center">
                          <ShieldCheck size={15} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                            PayPal Dynamic Settlement
                          </h3>
                          <p className="text-[10px] text-[#86868B] font-mono">
                            {order.paypal_authorization_id || order.paypal_order_id || 'Pre-Authorized'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          order.paypal_capture_id
                            ? 'bg-[#34C759]/15 text-[#34C759]'
                            : 'bg-[#0071E3]/12 text-[#0071E3]'
                        }`}
                      >
                        {order.paypal_capture_id ? 'Captured' : 'Hold Active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-[12px] bg-[#F5F5F7] dark:bg-[#2C2C2E]">
                        <p className="text-[10px] text-[#86868B]">Authorized</p>
                        <p className="font-bold tabular-nums mt-0.5">
                          ${parseFloat(order.authorized_amount || order.total_amount || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-[12px] bg-[#F5F5F7] dark:bg-[#2C2C2E]">
                        <p className="text-[10px] text-[#0071E3]">Captured</p>
                        <p className="font-bold tabular-nums text-[#0071E3] mt-0.5">
                          $
                          {parseFloat(
                            order.captured_amount || (order.paypal_capture_id ? order.total_amount : 0)
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-[12px] bg-[#34C759]/10">
                        <p className="text-[10px] text-[#34C759]">Released</p>
                        <p className="font-bold tabular-nums text-[#34C759] mt-0.5">
                          ${parseFloat(order.released_amount || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {order.paypal_invoice_url && (
                      <a
                        href={order.paypal_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-9 rounded-[10px] bg-[#0071E3] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        View Official PayPal Invoice
                      </a>
                    )}
                  </section>
                )}

                {/* Billing & Fulfillment Summary Sheet */}
                <section className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06] space-y-4">
                  <h2 className="text-[15px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Order Summary
                  </h2>

                  <div className="space-y-2 text-xs border-t border-[#E5E5EA] dark:border-[#38383A] pt-3.5">
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Subtotal</span>
                      <span className="font-medium tabular-nums">
                        ₹
                        {(order.items || [])
                          .reduce(
                            (sum, item) =>
                              sum +
                              (item.status !== 'REJECTED'
                                ? parseFloat(item.subtotal || item.price || 0)
                                : 0),
                            0
                          )
                          .toFixed(2)}
                      </span>
                    </div>

                    {parseFloat(order.discount_applied || 0) > 0 && (
                      <div className="flex justify-between text-[#34C759]">
                        <span>Store Savings</span>
                        <span className="font-medium tabular-nums">-₹{order.discount_applied}</span>
                      </div>
                    )}

                    {parseFloat(order.promo_discount || 0) > 0 && (
                      <div className="flex justify-between text-[#34C759]">
                        <span>Promo Discount</span>
                        <span className="font-medium tabular-nums">-₹{order.promo_discount}</span>
                      </div>
                    )}

                    {parseFloat(order.packaging_fee || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#86868B]">Packaging</span>
                        <span className="font-medium tabular-nums">₹{order.packaging_fee}</span>
                      </div>
                    )}

                    {parseFloat(order.delivery_fee || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#86868B]">Shipping</span>
                        <span className="font-medium tabular-nums">₹{order.delivery_fee}</span>
                      </div>
                    )}

                    {parseFloat(order.wallet_discount || 0) > 0 && (
                      <div className="flex justify-between text-[#34C759]">
                        <span>Wallet Applied</span>
                        <span className="font-medium tabular-nums">-₹{order.wallet_discount}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-bold pt-3 border-t border-[#E5E5EA] dark:border-[#38383A]">
                      <span>{order.status === 'COMPLETED' ? 'Total Paid' : 'Total Due'}</span>
                      <span className="text-base tabular-nums">
                        ₹{parseFloat(order.total_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Fulfillment Metadata */}
                  <div className="p-3.5 rounded-[16px] bg-[#F5F5F7] dark:bg-[#2C2C2E] space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      {order.order_type === 'DELIVERY' ? (
                        <Truck size={14} className="text-[#86868B] shrink-0 mt-0.5" />
                      ) : (
                        <Store size={14} className="text-[#86868B] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {order.order_type === 'DELIVERY' ? 'Home Delivery' : 'In-Store Pickup'}
                        </p>
                        <p className="text-[#86868B] mt-0.5">
                          {order.order_type === 'DELIVERY'
                            ? `${order.delivery_address || ''}${
                                order.delivery_pincode ? ` · ${order.delivery_pincode}` : ''
                              }`
                            : order.pickup_time || 'Ready in 25–30 mins'}
                        </p>
                      </div>
                    </div>

                    {order.delivery_slot_label && (
                      <div className="flex items-center gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#38383A] text-[#86868B]">
                        <Calendar size={13} className="shrink-0" />
                        <span>
                          {order.delivery_slot_date ? `${order.delivery_slot_date} · ` : ''}
                          {order.delivery_slot_label}
                        </span>
                      </div>
                    )}

                    {order.payment_method && (
                      <div className="flex items-center gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#38383A] text-[#86868B]">
                        <CreditCard size={13} className="shrink-0" />
                        <span>
                          Payment: <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">{order.payment_method}</strong>
                          {order.upi_transaction_id ? ` (UTR: ${order.upi_transaction_id})` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {order.customer_note && (
                    <div className="p-3 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-xs">
                      <p className="text-[10px] font-semibold uppercase text-[#86868B]">Delivery Note</p>
                      <p className="mt-0.5 text-[#1D1D1F] dark:text-[#F5F5F7]">{order.customer_note}</p>
                    </div>
                  )}
                </section>
              </aside>
            </div>
          )}
        </main>
      </div>
    </CustomerLayout>
  );
}

export default OrderDetailPage;
