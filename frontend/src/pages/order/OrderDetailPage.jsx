import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, PackageSearch, Truck, Store, XCircle, CheckCircle2, MapPin, Calendar, CreditCard } from 'lucide-react';
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

  const fetchOrder = useCallback((silent = false) => {
    return api
      .get(`/orders/${id}/`, { params: { t: Date.now() } })
      .then((response) => {
        setOrder(response.data);
        setError('');
      })
      .catch(() => {
        if (!silent) setError('Could not load this order.');
      });
  }, [id]);

  const handleWsMessage = useCallback((data) => {
    if (!data || !data.type) return;

    if (data.type === 'INITIAL_STATE' && data.order) {
      setOrder((prev) => ({ ...(prev || {}), ...data.order }));
    } else if (data.type === 'ORDER_STATUS_UPDATE') {
      const formattedStatus = String(data.status || '').toLowerCase().replace(/_/g, ' ');
      toast.success(`Order status updated to ${formattedStatus}`);
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: data.status,
          delivery_otp: data.delivery_otp || prev.delivery_otp,
          updated_at: data.updated_at || new Date().toISOString(),
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
              speed: data.speed,
            },
          };
        });
      }
    }
  }, []);

  const { isConnected: isWsConnected } = useWebSocket({
    path: `/ws/orders/${id}/tracking/`,
    enabled: Boolean(id),
    onMessage: handleWsMessage,
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
    COMPLETED: 5,
  };

  const getSteps = (type = 'DELIVERY') => [
    { id: 'NEW', rank: 0, label: 'Order Placed', desc: 'We received your order', icon: CheckCircle2 },
    { id: 'ACCEPTED', rank: 1, label: 'Order Accepted', desc: 'Store confirmed your order', icon: CheckCircle2 },
    { id: 'PREPARING', rank: 2, label: 'Preparing', desc: 'Store is packing your items', icon: PackageSearch },
    { id: 'READY', rank: 3, label: type === 'DELIVERY' ? 'Ready for Handover' : 'Ready for Pickup', desc: type === 'DELIVERY' ? 'Packed and awaiting rider' : 'Waiting for you at the store', icon: type === 'DELIVERY' ? Package : Store },
    ...(type === 'DELIVERY' ? [{ id: 'OUT_FOR_DELIVERY', rank: 4, label: 'Out for Delivery', desc: 'Rider is on the way to you!', icon: Truck }] : []),
    { id: 'COMPLETED', rank: 5, label: type === 'DELIVERY' ? 'Delivered' : 'Completed', desc: type === 'DELIVERY' ? 'Order delivered successfully' : 'Order picked up successfully', icon: CheckCircle2 }
  ];

  return (
    <CustomerLayout>
      <main className="mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 pb-24 md:pb-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-none cursor-pointer py-2 px-1"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {!order && !error && <p className="text-slate-500">Loading order...</p>}

        {order && (
          <>
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <p className="text-sm font-bold text-primary-700">Order confirmed</p>
                <h1 className="mt-1 text-3xl font-extrabold">{order.id}</h1>
              </div>
              {order.status === 'COMPLETED' && (
                <Link
                  to={`/orders/${order.id}/invoice`}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition block text-center shadow-sm"
                >
                  View Invoice
                </Link>
              )}
            </div>

            {/* Delivery OTP Card for Customer Verification */}
            {order.order_type === 'DELIVERY' && order.delivery_otp && order.status !== 'COMPLETED' && (
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-emerald-950/40 rounded-2xl p-4 sm:p-5 border border-emerald-500/30 mb-6 flex items-center justify-between gap-4 shadow-sm">
                <div>
                  <p className="text-xs uppercase font-black tracking-wider text-emerald-700 dark:text-emerald-400">
                    Delivery Verification OTP
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Share this OTP with your delivery partner upon arrival:
                  </p>
                  {order.delivery_partner_name && (
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                      🛵 Rider: {order.delivery_partner_name} {order.delivery_partner_phone ? `(${order.delivery_partner_phone})` : ''}
                    </p>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-2xl px-4 py-2 text-center shadow-md shrink-0">
                  <span className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                    {order.delivery_otp}
                  </span>
                </div>
              </div>
            )}

            {/* Live OpenStreetMap Route & Delivery Tracking */}
            {order.order_type === 'DELIVERY' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin size={18} className="text-emerald-600" /> Live Delivery Route & Tracking
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      OpenStreetMap road navigation between Narendra Kirana and your doorstep
                    </p>
                  </div>
                </div>
                <Suspense fallback={<div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-b-2xl animate-pulse text-sm text-slate-500 font-medium">Loading Route Map...</div>}>
                  <OrderTrackingMap order={order} storeSettings={storeSettings} />
                </Suspense>
              </div>
            )}

            {/* Tracking Timeline UI */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Track Order</h2>
              {order.status === 'REJECTED' ? (
                <div className="flex items-center gap-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-4 rounded-xl border border-red-100 dark:border-red-900">
                  <XCircle className="w-8 h-8 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg">Order Cancelled</h3>
                    <p className="text-sm opacity-90">This order was cancelled and any wallet balance has been refunded.</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-100 dark:bg-slate-800"></div>

                  <div className="space-y-6 relative">
                    {getSteps(order.order_type).map((step) => {
                      const currentRank = statusRankMap[order.status] ?? 0;
                      const isCompleted = currentRank >= step.rank;
                      const isActive = currentRank === step.rank;
                      const Icon = step.icon || CheckCircle2;

                      return (
                        <div key={step.id} className={`flex gap-4 items-start ${!isCompleted ? 'opacity-40' : ''}`}>
                          <div
                            className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm transition-colors duration-500 ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            } ${isActive ? 'ring-4 ring-emerald-100 dark:ring-emerald-950/60' : ''}`}
                          >
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                          </div>
                          <div className="pt-2 flex-1">
                            <h4 className={`text-sm font-bold ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                              {step.label}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {order.customer_note && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">Your Note</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">{order.customer_note}</p>
              </div>
            )}
            {order.owner_note && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <p className="text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Store Reply</p>
                <p className="text-sm text-emerald-900 dark:text-emerald-200">{order.owner_note}</p>
              </div>
            )}

            <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                Order Items
              </h2>
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex justify-between py-2 text-sm">
                  <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}>
                    {item.quantity} x {item.product_name_snapshot}
                    {item.status === 'REJECTED' && (
                      <span className="ml-2 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                        Unavailable
                      </span>
                    )}
                  </span>
                  <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-bold'}>
                    ₹{item.subtotal}
                  </span>
                </div>
              ))}

              <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Billing Summary</h2>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-slate-900 dark:text-white">
                      ₹
                      {(order.items || []).reduce(
                        (sum, item) => sum + (item.status !== 'REJECTED' ? parseFloat(item.subtotal || 0) : 0),
                        0
                      ).toFixed(2)}
                    </span>
                  </div>
                  {parseFloat(order.discount_applied || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Product Savings</span>
                      <span>- ₹{order.discount_applied}</span>
                    </div>
                  )}
                  {parseFloat(order.promo_discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Promo Discount</span>
                      <span>- ₹{order.promo_discount}</span>
                    </div>
                  )}
                  {parseFloat(order.packaging_fee || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Packaging Fee</span>
                      <span className="text-slate-900 dark:text-white">₹{order.packaging_fee}</span>
                    </div>
                  )}
                  {parseFloat(order.delivery_fee || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="text-slate-900 dark:text-white">₹{order.delivery_fee}</span>
                    </div>
                  )}
                  {parseFloat(order.wallet_discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Wallet Applied</span>
                      <span>- ₹{order.wallet_discount}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between font-extrabold text-lg pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-900 dark:text-white">
                    {order.status === 'COMPLETED' ? 'Total Amount Paid' : 'Total Due'}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{order.total_amount}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 text-center font-medium shadow-sm">
              {order.order_type === 'DELIVERY' ? (
                <>
                  <Truck className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                  Delivery to: <br />
                  <strong className="text-slate-800 dark:text-slate-200">{order.delivery_address || 'Home Delivery'}</strong>
                  {order.delivery_pincode && (
                    <>
                      <br />
                      Pincode: {order.delivery_pincode}
                    </>
                  )}
                </>
              ) : (
                <>
                  <Store className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                  Pickup: <strong className="text-slate-800 dark:text-slate-200">{order.pickup_time || 'As soon as possible'}</strong> <br />
                  Pay at store
                </>
              )}
              {order.delivery_slot_label && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span>
                    <span className="font-bold">Scheduled Slot:</span> {order.delivery_slot_date ? `${order.delivery_slot_date} • ` : ''}
                    {order.delivery_slot_label}
                  </span>
                </div>
              )}
              {order.payment_method && (
                <div className="mt-1 text-xs flex items-center justify-center gap-1.5">
                  <CreditCard size={14} className="text-slate-400" />
                  <span>
                    <span className="font-bold">Payment Method:</span>{' '}
                    {order.payment_method === 'UPI'
                      ? 'UPI / Online'
                      : order.payment_method === 'WALLET'
                      ? 'Wallet Balance'
                      : 'Cash on Delivery'}
                    {order.upi_transaction_id ? ` (Ref: ${order.upi_transaction_id})` : ''}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </CustomerLayout>
  );
}

export default OrderDetailPage;
