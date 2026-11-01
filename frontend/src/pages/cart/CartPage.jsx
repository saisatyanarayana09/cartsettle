import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBasket, ArrowLeft, AlertCircle, AlertTriangle, Clock, Zap, Shield, CheckCircle } from 'lucide-react';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import { checkOperatingHours } from '../../utils/operatingHours';

export function CartPage() {
  const navigate = useNavigate();
  const { cart, isCustomer, storeSettings, update, flushCartSync } = useCart();
  const [error, setError] = useState('');


  const items = cart?.items || [];

  if (!isCustomer) return <CustomerLayout><main className="mx-auto max-w-xl p-6 text-center"><h1 className="text-2xl font-extrabold">Your cart</h1><p className="mt-3 text-slate-600">Sign in to add products and place a pickup order.</p><Link to="/login" className="mt-5 inline-block rounded-xl bg-primary-600 px-5 py-3 font-bold text-white transition-all hover:bg-primary-700 active:scale-[0.98]">Sign in</Link></main></CustomerLayout>;

  async function change(item, quantity) {
    try {
      await update(item, quantity);
    } catch {
      setError('Could not update your cart.');
    }
  }

  async function handleProceedToCheckout() {
    if (flushCartSync) {
      await flushCartSync();
    }
    navigate('/checkout');
  }


  const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
  const emergencyPauseMsg = storeSettings?.emergency_pause_message || 'Online order placement is temporarily paused by the store due to high volume. We apologize for the inconvenience.';
  const operatingHours = checkOperatingHours(storeSettings);
  const isClosedHours = operatingHours.isClosed;

  const outOfStockItems = items.filter(item => item.is_in_stock === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0));
  const hasOutOfStock = outOfStockItems.length > 0;

  const discount = parseFloat(cart?.discount || 0);
  const mrpTotal = parseFloat(cart?.subtotal || 0);
  const itemsTotal = parseFloat(cart?.items_total || (mrpTotal - discount)) || mrpTotal;
  const packagingFee = parseFloat(cart?.packaging_fee || 0);
  const promoDiscount = parseFloat(cart?.promo_discount || 0);
  const totalPayable = parseFloat(cart?.total || (itemsTotal - promoDiscount + packagingFee));
  const freeThreshold = parseFloat(storeSettings?.free_delivery_threshold || 0);
  const freeDeliveryGap = Math.max(0, freeThreshold - itemsTotal);
  const isFreeDeliveryUnlocked = freeThreshold > 0 && itemsTotal >= freeThreshold;
  const minOrderAmount = parseFloat(storeSettings?.min_order_amount || 0);
  const isBelowMinOrder = minOrderAmount > 0 && itemsTotal < minOrderAmount;

  return (
    <CustomerLayout>
      <main className="mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 pb-36 md:pb-16">
        <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-transparent border-0 cursor-pointer py-2 px-1">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Your Cart</h1>
        </div>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs sm:text-sm font-bold text-red-700">{error}</p>}

        {/* Out of Stock Warning Banner */}
        {hasOutOfStock && (
          <div className="mb-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800/60 p-4 text-red-900 dark:text-red-200 flex items-start gap-3 shadow-xs">
            <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="font-black text-red-800 dark:text-red-300 uppercase tracking-wider text-xs mb-1">
                Action Required: Out of Stock
              </h2>
              <p className="text-xs font-semibold leading-relaxed">
                {outOfStockItems.length === 1
                  ? '1 item in your cart is currently out of stock. Please remove it to proceed to checkout.'
                  : `${outOfStockItems.length} items in your cart are currently out of stock. Please remove them to proceed to checkout.`}
              </p>
            </div>
          </div>
        )}

        {/* Store Emergency Pause Banner */}
        {isEmergencyPaused && (
          <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider text-xs mb-1">
                Store Emergency Pause Active
              </h2>
              <p className="text-xs font-semibold leading-relaxed">
                {emergencyPauseMsg}
              </p>
            </div>
          </div>
        )}

        {/* Operating Hours Notice */}
        {isClosedHours && (
          <div className="mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/60 p-4 text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-xs">
            <Clock className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider text-xs mb-1">
                Store Outside Operating Hours
              </h2>
              <p className="text-xs font-semibold leading-relaxed">
                {operatingHours.message}
              </p>
            </div>
          </div>
        )}

        {!items.length ? (
          <div className="mt-4 rounded-3xl bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5 shadow-inner">
              <ShoppingBasket size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Your cart is empty</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
              Looks like you haven't added anything to your cart yet. Browse fresh groceries and daily essentials!
            </p>
            <Link to="/products" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-[0.98] text-sm">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            {/* Items List */}
            <div className="flex-1 w-full space-y-3">
              {/* Free Delivery Threshold Progress Bar */}
              {freeThreshold > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs mb-3">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1.5">
                    <span>
                      {isFreeDeliveryUnlocked
                        ? 'Free Home Delivery unlocked!'
                        : `Add ₹${freeDeliveryGap.toFixed(0)} more for FREE Delivery`}
                    </span>
                    <span>₹{itemsTotal.toFixed(2)} / ₹{freeThreshold.toFixed(0)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-emerald-200/60 dark:bg-emerald-900 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (itemsTotal / freeThreshold) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {items.map((item) => {
                const stockQty = item.stock_quantity ?? 999;
                const maxOrderQty = item.max_order_quantity ?? 0;
                const isItemOutOfStock = item.is_in_stock === false || stockQty <= 0;
                const maxAllowed = maxOrderQty > 0 ? Math.min(stockQty, maxOrderQty) : stockQty;
                const isMaxReached = isItemOutOfStock || item.quantity >= maxAllowed;
                const unitPriceNum = parseFloat(item.unit_price || 0);
                const itemLineTotal = (unitPriceNum * item.quantity).toFixed(2);
                return (
                  <article key={item.id} className={`flex items-center gap-3.5 rounded-2xl bg-white dark:bg-slate-900 p-3.5 shadow-xs border transition-colors ${isItemOutOfStock ? 'border-red-200 bg-red-50/20 dark:bg-red-950/20' : 'border-slate-200/80 dark:border-slate-800'}`}>
                    <div className="grid size-14 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 font-black text-lg text-emerald-700 dark:text-emerald-400 shrink-0">
                      {item.product_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900 dark:text-white text-sm sm:text-base">{item.product_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        ₹{item.unit_price} · {item.product_unit}
                        {item.regular_price && Number(item.regular_price) > unitPriceNum && (
                          <span className="ml-1.5 line-through text-slate-400 text-[11px]">₹{item.regular_price}</span>
                        )}
                        {item.quantity > 1 && (
                          <span className="ml-1.5 text-slate-700 dark:text-slate-300 font-bold">· ₹{itemLineTotal}</span>
                        )}
                      </p>
                      {isItemOutOfStock && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900">
                          Out of Stock · Please remove
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-xs shrink-0 overflow-hidden ${isItemOutOfStock ? 'opacity-50' : ''}`}>
                      <button
                        onClick={() => change(item, item.quantity - 1)}
                        disabled={isItemOutOfStock}
                        title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                        aria-label={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                        className={`p-2 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                          item.quantity === 1
                            ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-slate-700 active:bg-emerald-200'
                        }`}
                      >
                        {item.quantity === 1 ? (
                          <Trash2 size={15} className="text-rose-500 hover:text-rose-600 transition-transform active:scale-110" />
                        ) : (
                          <Minus size={15} />
                        )}
                      </button>
                      <span className="w-7 text-center text-xs font-black text-slate-900 dark:text-white">{item.quantity}</span>
                      <button onClick={() => change(item, item.quantity + 1)} disabled={isMaxReached || isItemOutOfStock} className={`p-2 transition-colors shrink-0 ${isMaxReached ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 cursor-pointer'}`}><Plus size={15} /></button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Promo Code & Order Summary Section (Sticky Sidebar on Desktop) */}
            <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-24 space-y-4">

              {/* Order Summary Section */}
              <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-3.5">Bill Details</h2>
                <div className="space-y-2.5 text-xs sm:text-sm">
                  {discount > 0 ? (
                    <>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                        <span>Item MRP Total</span>
                        <span className="text-slate-900 dark:text-white font-bold">₹{mrpTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                        <span>Product Savings</span>
                        <span className="font-bold">- ₹{discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium border-t border-dashed border-slate-200 dark:border-slate-800 pt-1.5">
                        <span>Item Subtotal</span>
                        <span className="text-slate-900 dark:text-white font-bold">₹{itemsTotal.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                      <span>Item Subtotal</span>
                      <span className="text-slate-900 dark:text-white font-bold">₹{itemsTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Promo Discount</span>
                      <span>- ₹{promoDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {packagingFee > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                      <span>Packaging Fee</span>
                      <span className="text-slate-900 dark:text-white font-bold">₹{packagingFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between border-t border-slate-100 dark:border-slate-800 pt-3.5 text-lg font-black text-slate-900 dark:text-white">
                  <span>Total Payable</span>
                  <span className="text-emerald-600 dark:text-emerald-400">₹{totalPayable.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="mt-3 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center text-xs font-black text-emerald-800 dark:text-emerald-300">
                    You are saving ₹{discount.toFixed(2)} on this order!
                  </div>
                )}

                {storeSettings?.is_open === false ? (
                  <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 p-3.5 text-center font-bold text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 text-xs sm:text-sm">The store is currently closed.</div>
                ) : isEmergencyPaused ? (
                  <div className="mt-4 p-3.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-center font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm">
                    Order Placement Paused: {emergencyPauseMsg}
                  </div>
                ) : isClosedHours ? (
                  <div className="mt-4 p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-center font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm">
                    Store Closed: Outside scheduled operating hours
                  </div>
                ) : hasOutOfStock ? (
                  <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/60 p-3.5 text-center font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs sm:text-sm">
                    Remove out-of-stock items before checkout
                  </div>
                ) : isBelowMinOrder ? (
                  <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3.5 text-center font-bold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800 text-xs sm:text-sm">Minimum order amount is ₹{minOrderAmount.toFixed(0)}</div>
                ) : (
                  <>
                    <button onClick={handleProceedToCheckout} className="mt-4 w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-white shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] text-sm sm:text-base py-3 cursor-pointer flex items-center justify-center gap-2">
                      Proceed to Checkout →
                    </button>
                    <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">Pay securely online or at store pickup.</p>
                  </>
                )}
              </section>
            </div>

            {/* Mobile Sticky Checkout Bar (strictly mobile: lg:hidden) */}
            {storeSettings?.is_open !== false && !isEmergencyPaused && !isClosedHours && !hasOutOfStock && !isBelowMinOrder && items.length > 0 && (
              <div className="md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] inset-x-0 z-30 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 py-3 px-4 shadow-[0_-10px_20px_-3px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between gap-4 w-full">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Payable</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">₹{totalPayable.toFixed(2)}</p>
                  </div>
                  <button onClick={handleProceedToCheckout} className="flex-1 min-h-[44px] py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] font-black text-white shadow-md shadow-emerald-600/20 transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer">
                    Proceed to Checkout →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </CustomerLayout>
  );
}

export default CartPage;
