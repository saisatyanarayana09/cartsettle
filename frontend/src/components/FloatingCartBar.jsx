import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, ArrowRight, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useCart } from '../cart-context';

export function FloatingCartBar() {
  const { cart, storeSettings } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [visible, setVisible] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const timerRef = useRef(null);
  const prevCountRef = useRef(0);

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Calculate accurate total price
  const rawSubtotal = items.reduce((sum, item) => {
    const itemSub = parseFloat(item.subtotal || 0);
    if (itemSub > 0) return sum + itemSub;
    const p = typeof item.product === 'object' && item.product !== null ? item.product : {};
    const price = parseFloat(item.unit_price || p.offer_price || p.price || p.regular_price || 0);
    return sum + price * (item.quantity || 1);
  }, 0);

  const totalAmount = parseFloat(cart?.items_total || cart?.total || rawSubtotal) || rawSubtotal;
  const freeThreshold = parseFloat(storeSettings?.free_delivery_threshold || '0');
  const isFreeDelivery = freeThreshold > 0 && totalAmount >= freeThreshold;
  const shortfall = freeThreshold > 0 && !isFreeDelivery ? freeThreshold - totalAmount : 0;

  // Don't show on cart, checkout, or auth pages
  const isHiddenRoute = ['/cart', '/checkout', '/login', '/signup'].includes(location.pathname);

  useEffect(() => {
    if (itemCount > 0 && !isHiddenRoute) {
      // If item was added or changed, pop up the bar
      setVisible(true);
      setTimerKey(k => k + 1);

      // Reset auto-dismiss timer
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 10000);
    } else {
      setVisible(false);
    }

    prevCountRef.current = itemCount;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [itemCount, location.pathname, isHiddenRoute]);

  if (!visible || isHiddenRoute || itemCount === 0) {
    return null;
  }

  const handleDismiss = (e) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  const handleOpenCart = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    navigate('/cart');
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 md:right-6 md:left-auto md:translate-x-0 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-[460px] md:w-[420px] max-w-[calc(100vw-1.5rem)] z-50 animate-in fade-in slide-in-from-bottom-6 duration-300">
      <style>{`
        @keyframes cartBarShrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
      <div 
        onClick={handleOpenCart}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 border-2 border-emerald-400/90 shadow-2xl shadow-emerald-950/40 text-white cursor-pointer group hover:scale-[1.01] transition-transform active:scale-[0.99]"
      >
        {/* Auto-close Progress Bar with GPU-accelerated CSS keyframe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/25 overflow-hidden">
          <div 
            key={timerKey}
            className="h-full w-full bg-emerald-400"
            style={{
              animation: 'cartBarShrink 10s linear forwards',
              transformOrigin: 'left',
            }}
          />
        </div>

        <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3">
          {/* Left: Cart Icon & Details */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0 w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-emerald-200 group-hover:scale-105 transition-transform">
              <ShoppingCart size={22} className="stroke-[2.5]" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-emerald-500 text-white text-[11px] font-black rounded-full flex items-center justify-center ring-2 ring-emerald-900 shadow-sm">
                {itemCount}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black text-white tracking-tight">
                  ₹{totalAmount.toFixed(2)}
                </span>
                <span className="text-xs text-emerald-200/80 font-semibold">
                  ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
              </div>

              <div className="text-[11px] font-medium text-emerald-100/90 truncate flex items-center gap-1">
                {isFreeDelivery ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Free Delivery unlocked!
                  </span>
                ) : shortfall > 0 ? (
                  <span>Add ₹{shortfall.toFixed(0)} more for Free Delivery</span>
                ) : (
                  <span>Tap to review items & checkout</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: View Cart Button & Dismiss */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleOpenCart}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black tracking-wide shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
              <span>View Cart</span>
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              title="Dismiss"
              aria-label="Dismiss cart bar"
              className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-emerald-200/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
