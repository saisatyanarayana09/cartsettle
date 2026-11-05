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
  Check
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
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
            <ShoppingBag size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Your Bag is Waiting</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            Sign in to start ordering fresh essentials and unlock personalized member savings.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 px-7 py-3 text-xs sm:text-sm font-bold text-white transition-all active:scale-[0.98] shadow-sm"
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
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 pb-48 sm:pb-36">
        {/* Top Back Navigation */}
        <div className="mb-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1"
          >
            <ArrowLeft size={14} /> Back to Store
          </button>
        </div>

        {/* Minimalist Header */}
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Review your Bag</h1>
          {items.length > 0 && (
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Slender Hairline Free Delivery Tracker */}
        {freeThreshold > 0 && items.length > 0 && (
          <div className="mb-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              <div className="flex items-center gap-1.5">
                {isFreeDeliveryUnlocked ? (
                  <>
                    <Check size={14} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free standard delivery included</span>
                  </>
                ) : (
                  <span>
                    Add <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{freeDeliveryGap.toFixed(0)}</span> more to qualify for free delivery
                  </span>
                )}
              </div>
              <span className="font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                ₹{itemsTotal.toFixed(0)} / ₹{freeThreshold.toFixed(0)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ width: `${Math.min(100, (itemsTotal / freeThreshold) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/50 p-3 text-xs sm:text-sm font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
            {error}
          </p>
        )}

        {/* Subtle Alert Banners */}
        {hasOutOfStock && (
          <div className="mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3.5 text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-xs">
            <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={18} />
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-rose-800 dark:text-rose-300 mb-0.5">
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
          <div className="mt-10 py-16 px-6 text-center rounded-3xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center">
            <div className="size-16 rounded-2xl bg-white dark:bg-slate-800 grid place-items-center text-slate-400 dark:text-slate-500 mb-4 shadow-xs border border-slate-200/60 dark:border-slate-700/60">
              <ShoppingBag size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Your bag is empty</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              Explore freshly stocked groceries, fresh produce, and daily household essentials.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-sm"
            >
              <span>Start Shopping</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div>
            {/* Line-Item Rows */}
            <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
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
                    className={`py-5 sm:py-6 flex items-start gap-4 sm:gap-6 group transition-all duration-300 ease-out ${
                      isRemoving
                        ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none max-h-0 py-0 overflow-hidden'
                        : 'opacity-100'
                    }`}
                  >
                    {/* Product Photography Frame */}
                    <div className="size-20 sm:size-24 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-2 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="size-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.parentElement?.querySelector('.placeholder-icon');
                            if (sibling) sibling.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`placeholder-icon size-full items-center justify-center text-slate-300 dark:text-slate-600 ${
                          item.product_image ? 'hidden' : 'flex'
                        }`}
                      >
                        <ShoppingBag size={28} />
                      </div>
                    </div>

                    {/* Info & Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 pr-2">
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight line-clamp-2">
                            {item.product_name}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.product_unit} · ₹{item.unit_price} each
                          </p>
                          {isItemOutOfStock && (
                            <span className="inline-block mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                              Out of stock · Please remove
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                            ₹{itemLineTotal}
                          </p>
                          {item.regular_price && Number(item.regular_price) > unitPriceNum && (
                            <p className="text-xs text-slate-400 line-through tabular-nums mt-0.5">
                              ₹{(Number(item.regular_price) * item.quantity).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Controls: Pill Stepper & Bargain Link */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 px-1.5 shadow-2xs">
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity - 1)}
                            disabled={isItemOutOfStock}
                            title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                            aria-label={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                            className="size-7 rounded-full grid place-items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 size={13} className="text-rose-500 hover:text-rose-600 transition-transform active:scale-110" />
                            ) : (
                              <Minus size={13} />
                            )}
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-900 dark:text-white tabular-nums select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity + 1)}
                            disabled={isMaxReached || isItemOutOfStock}
                            title="Increase quantity"
                            aria-label="Increase quantity"
                            className="size-7 rounded-full grid place-items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {!isItemOutOfStock && (
                          <button
                            type="button"
                            onClick={() =>
                              setBargainProduct({
                                id: item.product || item.product_id || item.id,
                                name: item.product_name,
                                price: item.unit_price,
                              })
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition-all cursor-pointer active:scale-95"
                          >
                            <Sparkles size={13} className="text-amber-500" />
                            <span>Special Offer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Quiet Luxury Order Summary */}
            <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2.5 text-xs sm:text-sm">
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

            {/* Flush Frosted Checkout Dock */}
            <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800/60 px-4 sm:px-8 py-3.5 shadow-lg">
              <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                      ₹{totalPayable.toFixed(2)}
                    </span>
                    {discount > 0 && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                        Saved ₹{discount.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                {storeSettings?.is_open === false ? (
                  <div className="px-5 py-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm">
                    Store Closed
                  </div>
                ) : isEmergencyPaused ? (
                  <div className="px-5 py-3 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm">
                    Orders Paused
                  </div>
                ) : isClosedHours ? (
                  <div className="px-5 py-3 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm">
                    Store Closed
                  </div>
                ) : hasOutOfStock ? (
                  <div className="px-5 py-3 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm">
                    Remove Out of Stock
                  </div>
                ) : isBelowMinOrder ? (
                  <div className="px-5 py-3 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm">
                    Min Order ₹{minOrderAmount.toFixed(0)}
                  </div>
                ) : (
                  <button
                    onClick={handleProceedToCheckout}
                    className="h-12 px-7 sm:px-9 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md cursor-pointer shrink-0"
                  >
                    <span>Review & Pay</span>
                    <ArrowRight size={16} />
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
