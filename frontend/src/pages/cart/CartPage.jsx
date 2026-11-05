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
  Sparkles,
  Check,
  Truck
} from 'lucide-react';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import { checkOperatingHours } from '../../utils/operatingHours';
import BargainModal from '../../components/BargainModal';

export function CartPage() {
  const navigate = useNavigate();
  const { cart, isCustomer, storeSettings, update, flushCartSync } = useCart();
  const [error, setError] = useState('');
  const [bargainProduct, setBargainProduct] = useState(null);
  const [removingIds, setRemovingIds] = useState(new Set());

  const items = cart?.items || [];

  if (!isCustomer) {
    return (
      <CustomerLayout>
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
            <ShoppingBag size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Your Cart</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Sign in to start ordering fresh essentials and unlock personalized discounts.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition-all active:scale-[0.98] shadow-md shadow-emerald-600/20"
          >
            Sign in to continue
          </Link>
        </main>
        <BargainModal
          isOpen={Boolean(bargainProduct)}
          product={bargainProduct}
          onClose={() => setBargainProduct(null)}
          onDiscountApplied={(deal) => {
            console.log('Applied bargain deal:', deal);
          }}
        />
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
      }, 250);
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
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 pb-40 sm:pb-28">
        {/* Top Navigation & Header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1.5 px-1 rounded-lg"
          >
            <ArrowLeft size={16} /> Back to Store
          </button>
          {items.length > 0 && (
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Your Cart</h1>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/50 p-3 text-xs sm:text-sm font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
            {error}
          </p>
        )}

        {/* Warning Banners */}
        {hasOutOfStock && (
          <div className="mb-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3.5 text-red-900 dark:text-red-200 flex items-start gap-3 shadow-xs">
            <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={18} />
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-red-800 dark:text-red-300 mb-0.5">
                Action Required
              </h2>
              <p className="text-xs font-semibold leading-relaxed">
                {outOfStockItems.length === 1
                  ? '1 item in your cart is currently out of stock. Please remove it to proceed to checkout.'
                  : `${outOfStockItems.length} items in your cart are currently out of stock. Please remove them to proceed to checkout.`}
              </p>
            </div>
          </div>
        )}

        {isEmergencyPaused && (
          <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3.5 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-0.5">
                Orders Paused
              </h2>
              <p className="text-xs font-semibold leading-relaxed">{emergencyPauseMsg}</p>
            </div>
          </div>
        )}

        {isClosedHours && (
          <div className="mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3.5 text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-xs">
            <Clock className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={18} />
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-rose-800 dark:text-rose-300 mb-0.5">
                Store Closed
              </h2>
              <p className="text-xs font-semibold leading-relaxed">{operatingHours.message}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!items.length ? (
          <div className="mt-8 rounded-3xl bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 mb-4 border border-slate-200/60 dark:border-slate-700/60">
              <ShoppingBag size={32} />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-1.5">Your cart is empty</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed">
              Explore freshly stocked groceries, fresh produce, and daily household essentials.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 font-bold text-white transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98] text-sm"
            >
              Start Shopping <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Minimalist Free Delivery Progress Pill */}
            {freeThreshold > 0 && (
              <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs">
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500/10 dark:bg-emerald-500/15 transition-all duration-500 ease-out rounded-2xl"
                  style={{ width: `${Math.min(100, (itemsTotal / freeThreshold) * 100)}%` }}
                />
                <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <div
                      className={`size-6 rounded-lg grid place-items-center transition-colors ${
                        isFreeDeliveryUnlocked
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isFreeDeliveryUnlocked ? <Check size={13} className="stroke-[3]" /> : <Truck size={13} />}
                    </div>
                    {isFreeDeliveryUnlocked ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Free Home Delivery Unlocked</span>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-300">
                        Add <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">₹{freeDeliveryGap.toFixed(0)}</span> more for Free Delivery
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    ₹{itemsTotal.toFixed(0)} / ₹{freeThreshold.toFixed(0)}
                  </span>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="space-y-2.5">
              {items.map((item) => {
                const stockQty = item.stock_quantity ?? 999;
                const maxOrderQty = item.max_order_quantity ?? 0;
                const isItemOutOfStock = item.is_in_stock === false || stockQty <= 0;
                const maxAllowed = maxOrderQty > 0 ? Math.min(stockQty, maxOrderQty) : stockQty;
                const isMaxReached = isItemOutOfStock || item.quantity >= maxAllowed;
                const unitPriceNum = parseFloat(item.unit_price || 0);
                const itemLineTotal = (unitPriceNum * item.quantity).toFixed(2);
                const isRemoving = removingIds.has(item.id);

                return (
                  <article
                    key={item.id}
                    className={`group relative flex items-center gap-3.5 sm:gap-4 rounded-2xl bg-white dark:bg-slate-900 p-3 sm:p-3.5 border shadow-xs transition-all duration-300 ease-out ${
                      isRemoving
                        ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none max-h-0 py-0 mb-0 overflow-hidden'
                        : 'max-h-36 opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                    } ${
                      isItemOutOfStock
                        ? 'border-red-200 bg-red-50/20 dark:bg-red-950/20'
                        : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    {/* Item Thumbnail / Monogram */}
                    <div className="relative size-12 sm:size-14 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 grid place-items-center font-black text-base text-emerald-600 dark:text-emerald-400 shrink-0 overflow-hidden shadow-inner">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        item.product_name.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Item Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {item.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>
                          ₹{item.unit_price} · {item.product_unit}
                        </span>
                        {item.regular_price && Number(item.regular_price) > unitPriceNum && (
                          <span className="line-through text-slate-400 text-[11px]">₹{item.regular_price}</span>
                        )}
                        {item.quantity > 1 && (
                          <span className="text-slate-800 dark:text-slate-200 font-bold">· ₹{itemLineTotal}</span>
                        )}
                      </div>

                      {isItemOutOfStock ? (
                        <span className="inline-block mt-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900">
                          Out of Stock · Please remove
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setBargainProduct({
                              id: item.product || item.product_id || item.id,
                              name: item.product_name,
                              price: item.unit_price,
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-slate-700/70 transition-all cursor-pointer mt-1 active:scale-95"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>Bargain</span>
                        </button>
                      )}
                    </div>

                    {/* Stepper with Spring Press Haptics */}
                    <div
                      className={`flex items-center rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 p-0.5 shadow-xs shrink-0 ${
                        isItemOutOfStock ? 'opacity-50' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleQuantityChange(item, item.quantity - 1)}
                        disabled={isItemOutOfStock}
                        title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                        aria-label={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-85 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 size={14} className="text-rose-500 hover:text-rose-600 transition-transform active:scale-110" />
                        ) : (
                          <Minus size={14} />
                        )}
                      </button>
                      <span className="w-7 sm:w-8 text-center text-xs font-black text-slate-900 dark:text-white tabular-nums select-none">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item, item.quantity + 1)}
                        disabled={isMaxReached || isItemOutOfStock}
                        title="Increase quantity"
                        aria-label="Increase quantity"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-85 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Floating Island Checkout Dock */}
            <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] inset-x-3 z-30 sm:sticky sm:bottom-6 sm:inset-x-auto sm:z-20 max-w-3xl sm:mx-auto mt-6">
              <div className="rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-xl border border-slate-800 shadow-2xl p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Payable</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight tabular-nums">
                      ₹{totalPayable.toFixed(2)}
                    </span>
                    {discount > 0 && (
                      <span className="hidden xs:inline-flex items-center text-[11px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                        Saved ₹{discount.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                {storeSettings?.is_open === false ? (
                  <div className="px-4 py-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 font-bold text-xs sm:text-sm">
                    Store Closed
                  </div>
                ) : isEmergencyPaused ? (
                  <div className="px-4 py-2.5 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 font-bold text-xs sm:text-sm">
                    Order Paused
                  </div>
                ) : isClosedHours ? (
                  <div className="px-4 py-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 font-bold text-xs sm:text-sm">
                    Store Closed
                  </div>
                ) : hasOutOfStock ? (
                  <div className="px-4 py-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 font-bold text-xs sm:text-sm">
                    Remove Out of Stock
                  </div>
                ) : isBelowMinOrder ? (
                  <div className="px-4 py-2.5 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 font-bold text-xs sm:text-sm">
                    Min Order ₹{minOrderAmount.toFixed(0)}
                  </div>
                ) : (
                  <button
                    onClick={handleProceedToCheckout}
                    className="group flex items-center justify-center gap-2 px-5 sm:px-7 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bargain Modal */}
        <BargainModal
          isOpen={Boolean(bargainProduct)}
          product={bargainProduct}
          onClose={() => setBargainProduct(null)}
          onDiscountApplied={(deal) => {
            console.log('Applied bargain deal:', deal);
          }}
        />
      </main>
    </CustomerLayout>
  );
}

export default CartPage;
