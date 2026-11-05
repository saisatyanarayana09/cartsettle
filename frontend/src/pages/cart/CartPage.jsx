import React, { useState } from 'react';
import { Link, useNavigate } from '../../router';
import { 
  Minus, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  ArrowLeft, 
  ArrowRight,
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  Check,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import { checkOperatingHours } from '../../utils/operatingHours';

export function CartPage() {
  const navigate = useNavigate();
  const { cart, isCustomer, storeSettings, update, flushCartSync } = useCart();
  const [error, setError] = useState('');
  const [removingIds, setRemovingIds] = useState(new Set());
  const [showBillDrawer, setShowBillDrawer] = useState(false);

  // Track products added by AI assistant
  const [aiAddedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('cartsettle_ai_added_ids') || '[]'));
    } catch {
      return new Set();
    }
  });

  const items = cart?.items || [];

  if (!isCustomer) {
    return (
      <CustomerLayout>
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="size-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
            <ShoppingBag size={24} />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Your Cart is Waiting</h1>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            Sign in to start ordering fresh essentials and unlock personalized member savings.
          </p>
          <Link
            to="/login"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 px-6 py-2.5 text-xs font-bold text-white transition-all active:scale-[0.98] shadow-sm"
          >
            Sign in to continue
          </Link>
        </main>
      </CustomerLayout>
    );
  }

  async function change(item, quantity) {
    try {
      await update(item, quantity);
    } catch {
      setError('Could not update your cart.');
    }
  }

  async function handleQuantityChange(item, newQuantity) {
    if (newQuantity <= 0) {
      setRemovingIds((prev) => new Set(prev).add(item.id));
      setTimeout(async () => {
        await change(item, 0);
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 200);
    } else {
      await change(item, newQuantity);
    }
  }

  async function handleProceedToCheckout() {
    if (flushCartSync) {
      await flushCartSync();
    }
    navigate('/checkout');
  }

  const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
  const emergencyPauseMsg =
    storeSettings?.emergency_pause_message ||
    'Online order placement is temporarily paused by the store due to high volume. We apologize for the inconvenience.';
  const operatingHours = checkOperatingHours(storeSettings);
  const isClosedHours = operatingHours.isClosed;

  const outOfStockItems = items.filter(
    (item) => item.is_in_stock === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0)
  );
  const hasOutOfStock = outOfStockItems.length > 0;

  const discount = parseFloat(cart?.discount || 0);
  const mrpTotal = parseFloat(cart?.subtotal || 0);
  const itemsTotal = parseFloat(cart?.items_total || mrpTotal - discount) || mrpTotal;
  const packagingFee = parseFloat(cart?.packaging_fee || 0);
  const promoDiscount = parseFloat(cart?.promo_discount || 0);
  const totalPayable = parseFloat(cart?.total || itemsTotal - promoDiscount + packagingFee);
  const freeThreshold = parseFloat(storeSettings?.free_delivery_threshold || 0);
  const freeDeliveryGap = Math.max(0, freeThreshold - itemsTotal);
  const isFreeDeliveryUnlocked = freeThreshold > 0 && itemsTotal >= freeThreshold;
  const minOrderAmount = parseFloat(storeSettings?.min_order_amount || 0);
  const isBelowMinOrder = minOrderAmount > 0 && itemsTotal < minOrderAmount;

  return (
    <CustomerLayout>
      {/* Flush Sticky Top Header (zero negative margins/gaps, no shop button) */}
      <div className="sticky top-0 z-20 w-full px-4 sm:px-6 lg:px-8 py-2.5 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs active:scale-95 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
        >
          <ArrowLeft size={14} className="stroke-[2.5]" />
          <span>Back</span>
        </button>
        
        <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
          Cart {items.length > 0 && <span className="text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm">({items.length})</span>}
        </h1>
        
        <div className="w-14" />
      </div>

      <main className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-3 pb-36 lg:pb-16">
        {/* Empty State */}
        {!items.length ? (
          <div className="mt-8 py-16 px-4 text-center rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center max-w-md mx-auto">
            <div className="size-14 rounded-2xl bg-white dark:bg-slate-800 grid place-items-center text-slate-400 dark:text-slate-500 mb-3 shadow-xs border border-slate-200/60 dark:border-slate-700/60">
              <ShoppingBag size={24} />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1 tracking-tight">Your cart is empty</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-5 leading-relaxed">
              Explore freshly stocked groceries, produce, and daily essentials.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 h-10 px-6 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all active:scale-95 shadow-sm"
            >
              <span>Start Shopping</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          /* Expansive 2-Column Desktop Grid */
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
            {/* Left Column: Line Items & Alerts */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-3">
              {/* Slender Hairline Free Delivery Tracker */}
              {freeThreshold > 0 && (
                <div className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex justify-between items-center text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {isFreeDeliveryUnlocked ? (
                        <>
                          <Check size={13} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free delivery unlocked</span>
                        </>
                      ) : (
                        <span>
                          Add <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{freeDeliveryGap.toFixed(0)}</span> more for Free Delivery
                        </span>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                      ₹{itemsTotal.toFixed(0)} / ₹{freeThreshold.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(100, (itemsTotal / freeThreshold) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-xl bg-red-50 dark:bg-red-950/50 p-2.5 text-xs font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                  {error}
                </p>
              )}

              {/* Alert Banners */}
              {hasOutOfStock && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-2.5 text-rose-900 dark:text-rose-200 flex items-start gap-2 shadow-xs">
                  <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={15} />
                  <p className="text-xs font-semibold leading-snug">
                    {outOfStockItems.length === 1
                      ? '1 item in your cart is out of stock. Please remove it to proceed.'
                      : `${outOfStockItems.length} items in your cart are out of stock. Please remove them to proceed.`}
                  </p>
                </div>
              )}

              {isEmergencyPaused && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 text-amber-900 dark:text-amber-200 flex items-start gap-2 shadow-xs">
                  <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={15} />
                  <p className="text-xs font-semibold leading-snug">{emergencyPauseMsg}</p>
                </div>
              )}

              {isClosedHours && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-2.5 text-rose-900 dark:text-rose-200 flex items-start gap-2 shadow-xs">
                  <Clock className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={15} />
                  <p className="text-xs font-semibold leading-snug">{operatingHours.message}</p>
                </div>
              )}

              {/* Ultra-Compact Line-Item Rows */}
              <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 bg-white dark:bg-slate-900 rounded-2xl p-2 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                {items.map((item) => {
                  const stockQty = item.stock_quantity ?? 999;
                  const maxOrderQty = item.max_order_quantity ?? 0;
                  const isItemOutOfStock = item.is_in_stock === false || stockQty <= 0;
                  const maxAllowed = maxOrderQty > 0 ? Math.min(stockQty, maxOrderQty) : stockQty;
                  const isMaxReached = isItemOutOfStock || item.quantity >= maxAllowed;
                  const unitPriceNum = parseFloat(item.unit_price || 0);
                  const itemLineTotal = (unitPriceNum * item.quantity).toFixed(2);
                  const isRemoving = removingIds.has(item.id);

                  // AI item detection
                  const isAiAdded = 
                    Boolean(item.added_by_ai) || 
                    aiAddedIds.has(item.product) || 
                    aiAddedIds.has(item.product_id) || 
                    aiAddedIds.has(item.id);

                  const firstLetter = (item.product_name?.trim()?.charAt(0) || 'P').toUpperCase();

                  return (
                    <article
                      key={item.id}
                      className={`py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3.5 group transition-all duration-200 ease-out ${
                        isRemoving
                          ? 'opacity-0 scale-95 pointer-events-none max-h-0 py-0 overflow-hidden'
                          : 'opacity-100'
                      }`}
                    >
                      {/* Rounded-Square Product Frame with Letter Fallback */}
                      <div className="size-14 sm:size-16 rounded-xl aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-0.5 flex items-center justify-center shrink-0">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="size-full object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const sibling = e.currentTarget.parentElement?.querySelector('.monogram-fallback');
                              if (sibling) sibling.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div
                          className={`monogram-fallback size-full rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-black text-base sm:text-lg flex items-center justify-center select-none ${
                            item.product_image ? 'hidden' : 'flex'
                          }`}
                        >
                          {firstLetter}
                        </div>
                      </div>

                      {/* Info & Unit */}
                      <div className="flex-1 min-w-0 pr-1">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                          {item.product_name}
                        </h2>
                        
                        <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ₹{item.unit_price} · {item.product_unit}
                          </span>
                          
                          {/* Added by AI Micro-Badge without extra row height */}
                          {isAiAdded && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-200/60 dark:border-purple-800/60">
                              Added by AI
                            </span>
                          )}

                          {isItemOutOfStock && (
                            <span className="inline-block text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900">
                              Out of stock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stepper Pill & Item Total */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Compact Pill Stepper */}
                        <div className="flex items-center h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 px-1 shadow-2xs">
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity - 1)}
                            disabled={isItemOutOfStock}
                            title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                            aria-label={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                            className="size-6 rounded-full grid place-items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 size={12} className="text-rose-500 hover:text-rose-600 transition-transform active:scale-110" />
                            ) : (
                              <Minus size={12} />
                            )}
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-900 dark:text-white tabular-nums select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity + 1)}
                            disabled={isMaxReached || isItemOutOfStock}
                            title="Increase quantity"
                            aria-label="Increase quantity"
                            className="size-6 rounded-full grid place-items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Line Item Total */}
                        <div className="text-right min-w-[56px]">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                            ₹{itemLineTotal}
                          </p>
                          {item.regular_price && Number(item.regular_price) > unitPriceNum && (
                            <p className="text-[10px] text-slate-400 line-through tabular-nums">
                              ₹{(Number(item.regular_price) * item.quantity).toFixed(0)}
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Desktop Native Sticky Order Summary Card (hidden on mobile, sticky on desktop) */}
            <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-16">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100 dark:border-slate-800">
                  Order Summary
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      ₹{mrpTotal > 0 ? mrpTotal.toFixed(2) : itemsTotal.toFixed(2)}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Store Savings</span>
                      <span className="font-semibold tabular-nums">-₹{discount.toFixed(2)}</span>
                    </div>
                  )}

                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Promo Discount</span>
                      <span className="font-semibold tabular-nums">-₹{promoDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {packagingFee > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Packaging & Handling</span>
                      <span className="font-semibold text-slate-900 dark:text-white tabular-nums">₹{packagingFee.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Delivery</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {isFreeDeliveryUnlocked ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Free</span>
                      ) : (
                        <span>Calculated at checkout</span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <span>Total Payable</span>
                    <span className="tabular-nums">₹{totalPayable.toFixed(2)}</span>
                  </div>
                </div>

                {/* Primary CTA on Desktop */}
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
                ) : hasOutOfStock ? (
                  <div className="w-full py-3 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs text-center">
                    Remove Out of Stock
                  </div>
                ) : isBelowMinOrder ? (
                  <div className="w-full py-3 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-xs text-center">
                    Min Order ₹{minOrderAmount.toFixed(0)}
                  </div>
                ) : (
                  <button
                    onClick={handleProceedToCheckout}
                    className="w-full h-11 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Mobile Sticky Bottom Dock with Expandable Bill Drawer (lg:hidden) */}
        {items.length > 0 && (
          <aside className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-2xl transition-all duration-300">
            {/* Live Bill Breakdown Drawer */}
            {showBillDrawer && (
              <div className="px-4 py-3 bg-slate-50/95 dark:bg-slate-900/95 border-b border-slate-200/60 dark:border-slate-800/60 space-y-2 text-xs animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    ₹{mrpTotal > 0 ? mrpTotal.toFixed(2) : itemsTotal.toFixed(2)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Store Savings</span>
                    <span className="font-semibold tabular-nums">-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Promo Discount</span>
                    <span className="font-semibold tabular-nums">-₹{promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                {packagingFee > 0 && (
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Packaging & Handling</span>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">₹{packagingFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Delivery</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {isFreeDeliveryUnlocked ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Free</span>
                    ) : (
                      <span>Calculated at checkout</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Bar: Total Due + Expand Toggle + Primary CTA */}
            <div className="px-4 py-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => setShowBillDrawer(!showBillDrawer)}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
                >
                  <span>Bill Details</span>
                  {showBillDrawer ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    ₹{totalPayable.toFixed(2)}
                  </span>
                  {discount > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Saved ₹{discount.toFixed(0)}
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
              ) : hasOutOfStock ? (
                <div className="px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs">
                  Remove Out of Stock
                </div>
              ) : isBelowMinOrder ? (
                <div className="px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-xs">
                  Min Order ₹{minOrderAmount.toFixed(0)}
                </div>
              ) : (
                <button
                  onClick={handleProceedToCheckout}
                  className="h-10 px-6 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-md cursor-pointer shrink-0"
                >
                  <span>Review & Pay</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </aside>
        )}
      </main>
    </CustomerLayout>
  );
}

export default CartPage;
