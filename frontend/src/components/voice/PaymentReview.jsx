import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, CheckCircle2, ShoppingBag, Sparkles, MapPin, Wallet, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validPaymentDetails } from "./payment-review";

export function PaymentReview({
  review,
  onConfirm,
  onCancel,
  onOpen,
  busy,
  cartItems = [],
  cartTotal = 0,
  onPlaceInlineOrder,
}) {
  const heading = useRef(null);
  const [payMethod, setPayMethod] = useState("COD");
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    if (review) {
      setPlacedOrder(null);
      const lower = String(review.prompt || "").toLowerCase();
      if (lower.includes("wallet")) setPayMethod("WALLET");
      else setPayMethod("COD");
      heading.current?.focus();
    }
  }, [review]);

  if (!review) return null;

  const ready = validPaymentDetails(review) && typeof onConfirm === "function";
  const hasInlineCheckout = typeof onPlaceInlineOrder === "function";
  const itemCount = Array.isArray(cartItems)
    ? cartItems.reduce((sum, ci) => sum + Number(ci.quantity || 1), 0)
    : 0;
  const effectiveTotal = Number(cartTotal || review.amount || 0);
  const autoDiscount = effectiveTotal >= 15 ? Number((effectiveTotal * 0.1).toFixed(2)) : 0;
  const finalPayable = Math.max(0, Number((effectiveTotal - autoDiscount).toFixed(2)));

  if (placedOrder) {
    return (
      <div
        className="assistant-payment assistant-inline-checkout-confirmed"
        role="status"
        aria-live="polite"
      >
        <div className="assistant-auto-dismiss-bar mb-3 rounded-full" />
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 shrink-0 animate-bounce">
            <CheckCircle2 className="size-6 stroke-[2.25]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Order #{placedOrder.id} Confirmed
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              {placedOrder.payMethod === "WALLET" ? "Paid via Store Wallet" : "Cash on Delivery"} · Arriving in 15–20 mins
            </p>
          </div>
          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
            ₹{placedOrder.total}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="assistant-payment" role="region" aria-labelledby="payment-review-title">
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {hasInlineCheckout ? "Instant Live Checkout" : "Payment review"}
          </span>
        </div>
        {hasInlineCheckout && itemCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <ShoppingBag className="size-3.5 text-emerald-500" />
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      <h3
        ref={heading}
        tabIndex={-1}
        id="payment-review-title"
        className="mt-2 text-lg font-bold outline-none text-slate-900 dark:text-white"
      >
        {ready
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: review.currency || "USD",
            }).format(Number(review.amount))
          : "Review payment details"}
      </h3>

      {hasInlineCheckout ? (
        <div className="mt-2.5 space-y-2.5">
          {/* Compact Price & Smart Auto-Savings Summary */}
          <div className="flex items-center justify-between rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 px-3 py-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="size-3 text-emerald-500" />
                <span>Express Doorstep Delivery (15–20m)</span>
              </div>
              {autoDiscount > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="size-3" />
                  <span>Smart 10% Bundle Savings (-₹{autoDiscount})</span>
                </div>
              )}
            </div>
            <div className="text-right">
              {autoDiscount > 0 && (
                <span className="block text-[11px] line-through text-slate-400">
                  ₹{effectiveTotal.toFixed(2)}
                </span>
              )}
              <span className="text-base font-extrabold text-slate-900 dark:text-white">
                ₹{finalPayable.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Pills */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPayMethod("COD")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                payMethod === "COD"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"
              }`}
            >
              <Banknote className="size-3.5" />
              Cash on Delivery
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("WALLET")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                payMethod === "WALLET"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"
              }`}
            >
              <Wallet className="size-3.5" />
              Store Wallet
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm">{review.recipient || "Recipient not provided"}</p>
          <p className="mt-2 text-sm text-muted-foreground break-words">{review.prompt}</p>
        </>
      )}

      <p role="status" className="mt-2.5 text-[11px] text-muted-foreground">
        {ready
          ? "Tap to confirm. Voice cannot approve."
          : "Review verified details and approve below. Nothing has been paid yet."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        {hasInlineCheckout && (
          <Button
            size="sm"
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm cursor-pointer"
            onClick={() => {
              const orderId = `20${Math.floor(40 + Math.random() * 59)}`;
              setPlacedOrder({
                id: orderId,
                payMethod,
                total: finalPayable.toFixed(2),
              });
              onPlaceInlineOrder?.({
                id: orderId,
                payMethod,
                total: finalPayable,
              });
            }}
          >
            Place Order Here
          </Button>
        )}
        {ready ? (
          <Button size="sm" onClick={onConfirm} disabled={busy}>
            Confirm payment
          </Button>
        ) : (
          <Button
            size="sm"
            variant={hasInlineCheckout ? "ghost" : "default"}
            onClick={onOpen}
          >
            Open payment details
          </Button>
        )}
      </div>
    </div>
  );
}
