import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from '../../router';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import { checkOperatingHours } from '../../utils/operatingHours';
import { optimizeImage } from '../../utils/image';
import BargainModal from '../../components/BargainModal';

export function CartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, isCustomer, storeSettings, update, flushCartSync, refresh, applyDeal } = useCart();
  const [error, setError] = useState('');
  const [removingIds, setRemovingIds] = useState(new Set());
  const [showBillDrawer, setShowBillDrawer] = useState(false);
  const [bargainProduct, setBargainProduct] = useState(null);

  // Track products added by AI assistant
  const [aiAddedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('cartsettle_ai_added_ids') || '[]'));
    } catch {
      return new Set();
    }
  });

  const items = cart?.items || [];

  function handleBack() {
    const fromPath = location?.state?.from?.pathname || location?.state?.from;
    if (
      typeof fromPath === 'string' &&
      fromPath.startsWith('/') &&
      !fromPath.startsWith('/checkout') &&
      !fromPath.startsWith('/cart')
    ) {
      navigate(fromPath);
      return;
    }
    navigate('/products');
  }

  if (!isCustomer) {
    return (
      <CustomerLayout>
        <div className="min-h-[80vh] bg-[#F5F5F7] dark:bg-black flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-white dark:bg-[#1C1C1E] rounded-[24px] p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-black/[0.03] dark:border-white/[0.06]">
            <div className="size-14 mx-auto mb-4 rounded-[16px] bg-[#F5F5F7] dark:bg-[#2C2C2E] grid place-items-center text-[#1D1D1F] dark:text-[#F5F5F7]">
              <ShoppingBag size={24} />
            </div>
            <h1 className="text-xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              Your Bag is Waiting
            </h1>
            <p className="mt-1.5 text-xs text-[#86868B] leading-relaxed">
              Sign in to view your saved items and check out with instant member savings.
            </p>
            <Link
              to="/login"
              className="mt-6 w-full h-11 inline-flex items-center justify-center rounded-[14px] bg-[#1D1D1F] hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#1D1D1F] text-xs font-semibold transition-all active:scale-[0.98]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  async function change(item, quantity) {
    try {
      await update(item, quantity);
    } catch {
      setError('Could not update your bag.');
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
      }, 180);
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
    'Online ordering is temporarily paused by the store due to high volume.';
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
  const freeProgressPct = freeThreshold > 0 ? Math.min(100, (itemsTotal / freeThreshold) * 100) : 100;
  const minOrderAmount = parseFloat(storeSettings?.min_order_amount || 0);
  const isBelowMinOrder = minOrderAmount > 0 && itemsTotal < minOrderAmount;

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] antialiased">
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-4 pb-36 lg:pb-16">
          {/* Authentic Apple HIG Bag Top Navigation Bar (Non-overlapping with CustomerHeader) */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5EA] dark:border-[#38383A]">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back to store"
              className="inline-flex items-center gap-1 -ml-1.5 px-2.5 py-1.5 rounded-[10px] text-[#0071E3] dark:text-[#0A84FF] hover:bg-[#0071E3]/10 font-semibold text-[14px] active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft size={18} className="stroke-[2.4]" />
              <span>Continue Shopping</span>
            </button>

            <div className="text-right">
              <h1 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] leading-none">
                Bag
              </h1>
              {items.length > 0 && (
                <p className="text-[11px] font-medium text-[#86868B] tabular-nums mt-0.5">
                  {items.length} {items.length === 1 ? 'item' : 'items'} · ₹{totalPayable.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Store Constraint Alerts */}
          {isEmergencyPaused && (
            <div className="mb-4 p-3.5 rounded-[16px] bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ordering Temporarily Paused</p>
                <p className="opacity-80 mt-0.5">{emergencyPauseMsg}</p>
              </div>
            </div>
          )}

          {!isEmergencyPaused && isClosedHours && (
            <div className="mb-4 p-3.5 rounded-[16px] bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-start gap-2.5">
              <Clock size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Store Outside Operating Hours</p>
                <p className="opacity-80 mt-0.5">{operatingHours.message}</p>
              </div>
            </div>
          )}

          {hasOutOfStock && (
            <div className="mb-4 p-3.5 rounded-[16px] bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unavailable Items in Bag</p>
                <p className="opacity-80 mt-0.5">
                  Please remove {outOfStockItems.map((i) => i.product_name).join(', ')} to continue.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-[14px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {!items.length ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] py-16 px-6 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06] max-w-md mx-auto my-6">
              <div className="size-14 mx-auto mb-3.5 rounded-[16px] bg-[#F5F5F7] dark:bg-[#2C2C2E] grid place-items-center text-[#86868B]">
                <ShoppingBag size={24} />
              </div>
              <h2 className="text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                Your bag is empty
              </h2>
              <p className="mt-1 text-xs text-[#86868B] max-w-xs mx-auto leading-relaxed">
                Explore fresh daily groceries and household essentials curated for quick delivery.
              </p>
              <Link
                to="/products"
                className="mt-5 inline-flex items-center justify-center rounded-[14px] bg-[#1D1D1F] hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#1D1D1F] px-6 h-10 text-xs font-semibold transition-all active:scale-95"
              >
                Shop Groceries
              </Link>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-12 lg:gap-7 items-start">
              {/* Left 7 Columns: Unified Apple Store Inset Grouped Sheet */}
              <div className="lg:col-span-7">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06] overflow-hidden divide-y divide-[#E5E5EA] dark:divide-[#38383A]">
                  {items.map((item) => {
                    const stockQty = item.stock_quantity ?? 999;
                    const maxOrderQty = item.max_order_quantity ?? 0;
                    const isItemOutOfStock = item.is_in_stock === false || stockQty <= 0;
                    const maxAllowed = maxOrderQty > 0 ? Math.min(stockQty, maxOrderQty) : stockQty;
                    const isMaxReached = isItemOutOfStock || item.quantity >= maxAllowed;
                    const unitPriceNum = parseFloat(item.unit_price || 0);
                    const itemLineTotal = (unitPriceNum * item.quantity).toFixed(2);
                    const isRemoving = removingIds.has(item.id);
                    const isAiAdded =
                      Boolean(item.added_by_ai || item.is_ai_added) ||
                      aiAddedIds.has(item.product) ||
                      aiAddedIds.has(item.id);
                    const firstLetter = (item.product_name || 'P').trim().charAt(0).toUpperCase();

                    return (
                      <article
                        key={item.id}
                        className={`p-4 sm:px-5 sm:py-4 flex items-center gap-3.5 sm:gap-4 transition-all duration-200 ${
                          isRemoving ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'
                        } ${isItemOutOfStock ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}
                      >
                        {/* 56px Rounded Squircle Product Thumbnail or SF Monogram */}
                        <div className="size-14 sm:size-16 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] shrink-0 overflow-hidden flex items-center justify-center p-1.5">
                          {item.product_image ? (
                            <img
                              src={optimizeImage(item.product_image, 120)}
                              alt={item.product_name}
                              className={`w-full h-full object-contain ${
                                isItemOutOfStock ? 'grayscale opacity-40' : ''
                              }`}
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-lg font-bold text-[#86868B] select-none">
                              {firstLetter}
                            </span>
                          )}
                        </div>

                        {/* Product Info & Controls */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="text-[14px] sm:text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate tracking-tight">
                              {item.product_name}
                            </h2>
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[#86868B]">
                            <span>
                              {item.product_unit} · ₹{unitPriceNum.toFixed(0)}
                            </span>

                            {isAiAdded && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0071E3]/10 dark:bg-[#0A84FF]/20 text-[#0071E3] dark:text-[#0A84FF]">
                                Added by AI
                              </span>
                            )}

                            {isItemOutOfStock && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                Out of stock
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                                ₹{itemLineTotal}
                              </span>
                              {Number(item.regular_price) > unitPriceNum && (
                                <span className="text-[11px] text-[#86868B] line-through tabular-nums">
                                  ₹{(Number(item.regular_price) * item.quantity).toFixed(0)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setBargainProduct({
                                    id: item.product || item.id,
                                    name: item.product_name,
                                    price: unitPriceNum
                                  })
                                }
                                className="text-[12px] font-medium text-[#0071E3] dark:text-[#0A84FF] hover:underline cursor-pointer"
                              >
                                Make Offer
                              </button>
                            </div>

                            {/* Authentic iOS #F5F5F7 Capsule Stepper */}
                            <div className="inline-flex items-center h-8 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] px-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                disabled={item.quantity > 1 && isItemOutOfStock}
                                title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                                aria-label={
                                  item.quantity === 1
                                    ? `Remove ${item.product_name}`
                                    : `Decrease ${item.product_name}`
                                }
                                className="size-6 rounded-full grid place-items-center text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                {item.quantity === 1 ? (
                                  <Trash2 size={12} className="text-rose-500" />
                                ) : (
                                  <Minus size={12} />
                                )}
                              </button>
                              <span
                                aria-label={`${item.product_name} quantity`}
                                className="w-6 text-center text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums select-none"
                              >
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                disabled={isMaxReached || isItemOutOfStock}
                                title="Increase quantity"
                                aria-label={`Increase ${item.product_name}`}
                                className="size-6 rounded-full grid place-items-center text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Subtle Apple Blue Add More Items Link */}
                <div className="mt-3.5 px-2">
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-[#0071E3] dark:text-[#0A84FF] hover:underline"
                  >
                    <Plus size={14} />
                    <span>Add more items</span>
                  </Link>
                </div>
              </div>

              {/* Right 5 Columns: Sticky Apple Bag Summary Sheet (Desktop) */}
              <aside className="hidden lg:block lg:col-span-5 sticky top-20">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-5 sm:p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06]">
                  <h3 className="text-[17px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                    Order Summary
                  </h3>

                  {/* iOS #34C759 Free Delivery Progress Bar */}
                  {freeThreshold > 0 && (
                    <div className="mt-2.5 mb-4">
                      <p className="text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {isFreeDeliveryUnlocked
                          ? 'Free delivery unlocked'
                          : `Add ₹${freeDeliveryGap.toFixed(0)} more for free delivery`}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#E8E8ED] dark:bg-[#2C2C2E] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#34C759] transition-all duration-500 ease-out"
                          style={{ width: `${freeProgressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Hairline Financial Breakdown */}
                  <div className="space-y-2.5 text-[13px] border-t border-[#E5E5EA] dark:border-[#38383A] pt-4">
                    <div className="flex justify-between text-[#1D1D1F] dark:text-[#F5F5F7]">
                      <span className="text-[#86868B]">Subtotal</span>
                      <span className="font-medium tabular-nums">₹{mrpTotal.toFixed(2)}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-[#34C759] dark:text-[#30D158]">
                        <span>Store Savings</span>
                        <span className="font-medium tabular-nums">-₹{discount.toFixed(2)}</span>
                      </div>
                    )}

                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-[#34C759] dark:text-[#30D158]">
                        <span>Promo Discount</span>
                        <span className="font-medium tabular-nums">-₹{promoDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {packagingFee > 0 && (
                      <div className="flex justify-between text-[#1D1D1F] dark:text-[#F5F5F7]">
                        <span className="text-[#86868B]">Packaging</span>
                        <span className="font-medium tabular-nums">₹{packagingFee.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#1D1D1F] dark:text-[#F5F5F7]">
                      <span className="font-medium">Shipping</span>
                      <span className="font-semibold">
                        {isFreeDeliveryUnlocked ? 'FREE' : 'Calculated at checkout'}
                      </span>
                    </div>
                  </div>

                  {/* Total Line */}
                  <div className="border-t border-[#E5E5EA] dark:border-[#38383A] mt-4 pt-4 flex items-baseline justify-between">
                    <span className="text-[16px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Total
                    </span>
                    <span className="text-[20px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums tracking-tight">
                      ₹{totalPayable.toFixed(2)}
                    </span>
                  </div>

                  {/* Primary Apple Pay Obsidian CTA */}
                  <div className="mt-5">
                    {storeSettings?.is_open === false || isClosedHours ? (
                      <div className="w-full py-3 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#86868B] font-semibold text-xs text-center">
                        Store Closed
                      </div>
                    ) : isEmergencyPaused ? (
                      <div className="w-full py-3 rounded-[14px] bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-xs text-center">
                        Orders Paused
                      </div>
                    ) : hasOutOfStock ? (
                      <div className="w-full py-3 rounded-[14px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-xs text-center">
                        Remove Out of Stock Items
                      </div>
                    ) : isBelowMinOrder ? (
                      <div className="w-full py-3 rounded-[14px] bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-xs text-center">
                        Minimum Order ₹{minOrderAmount.toFixed(0)}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleProceedToCheckout}
                        aria-label="Checkout"
                        className="w-full h-11 rounded-[14px] bg-[#1D1D1F] hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#1D1D1F] font-semibold text-[14px] flex items-center justify-center transition-all active:scale-[0.99] cursor-pointer"
                      >
                        Check Out
                      </button>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* Mobile Sticky Bottom Frosted Apple Summary Sheet */}
          {items.length > 0 && (
            <aside className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-2xl border-t border-[#E5E5EA] dark:border-[#38383A]">
              {/* Top 3px iOS Green Free Delivery Progress Line */}
              {freeThreshold > 0 && (
                <div className="h-[3px] w-full bg-[#E8E8ED] dark:bg-[#2C2C2E] overflow-hidden">
                  <div
                    className="h-full bg-[#34C759] transition-all duration-500"
                    style={{ width: `${freeProgressPct}%` }}
                  />
                </div>
              )}

              {/* Expandable Bill Breakdown Drawer */}
              {showBillDrawer && (
                <div className="px-4 py-3.5 border-b border-[#E5E5EA] dark:border-[#38383A] space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E5EA] dark:border-[#38383A]">
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      Order Summary
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBillDrawer(false)}
                      className="text-[#0071E3] dark:text-[#0A84FF] font-medium"
                    >
                      Done
                    </button>
                  </div>
                  <div className="flex justify-between text-[#86868B]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                      ₹{mrpTotal.toFixed(2)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[#34C759]">
                      <span>Store Savings</span>
                      <span className="font-medium tabular-nums">-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-[#34C759]">
                      <span>Promo Discount</span>
                      <span className="font-medium tabular-nums">-₹{promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {packagingFee > 0 && (
                    <div className="flex justify-between text-[#86868B]">
                      <span>Packaging</span>
                      <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                        ₹{packagingFee.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#86868B]">
                    <span>Shipping</span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {isFreeDeliveryUnlocked ? 'FREE' : 'At checkout'}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Dock Bar */}
              <div className="px-4 py-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setShowBillDrawer(!showBillDrawer)}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                  >
                    <span>Total</span>
                    {showBillDrawer ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </button>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums tracking-tight">
                      ₹{totalPayable.toFixed(2)}
                    </span>
                    {discount > 0 && (
                      <span className="text-[11px] font-semibold text-[#34C759]">
                        Saved ₹{discount.toFixed(0)}
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
                ) : hasOutOfStock ? (
                  <div className="px-4 py-2 rounded-[12px] bg-rose-500/10 text-rose-600 font-semibold text-xs">
                    Remove Unavailable
                  </div>
                ) : isBelowMinOrder ? (
                  <div className="px-4 py-2 rounded-[12px] bg-amber-500/10 text-amber-700 font-semibold text-xs">
                    Min ₹{minOrderAmount.toFixed(0)}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToCheckout}
                    aria-label="Checkout"
                    className="h-10 px-7 rounded-[12px] bg-[#1D1D1F] hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#1D1D1F] font-semibold text-[13px] flex items-center justify-center active:scale-[0.98] transition-all cursor-pointer shrink-0"
                  >
                    Check Out
                  </button>
                )}
              </div>
            </aside>
          )}
        </main>

        {/* Bargain Modal */}
        <BargainModal
          isOpen={Boolean(bargainProduct)}
          onClose={() => setBargainProduct(null)}
          product={bargainProduct}
          onDiscountApplied={async (info) => {
            if (info?.dealToken && applyDeal) {
              await applyDeal(info.dealToken);
            } else if (refresh) {
              await refresh();
            }
          }}
        />
      </div>
    </CustomerLayout>
  );
}

export default CartPage;
