import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validPaymentDetails } from "./payment-review";

const formatCurrency = (value, currency = "USD") => {
  const num = Number(value) || 0;
  if (currency === "INR") {
    return `\u20B9${Number.isInteger(num) ? num : num.toFixed(2)}`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
};

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
  const [payMethod, setPayMethod] = useState("PAYPAL");
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    if (review) {
      setPlacedOrder(null);
      const lower = String(review.prompt || "").toLowerCase();
      if (lower.includes("wallet")) setPayMethod("WALLET");
      else if (lower.includes("cod") || lower.includes("cash")) setPayMethod("COD");
      else setPayMethod("PAYPAL");
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

  if (placedOrder) {
    return (
      <div
        className="assistant-payment assistant-card-materialize"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Order #{placedOrder.id} Confirmed
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {placedOrder.payMethod === "PAYPAL"
                  ? "PayPal"
                  : placedOrder.payMethod === "WALLET"
                    ? "Wallet"
                    : "COD"}
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(placedOrder.total, review?.currency || "INR")}
          </span>
        </div>
        <div className="assistant-auto-dismiss-bar mt-2.5 rounded-full" />
      </div>
    );
  }

  return (
    <div
      className="assistant-payment assistant-card-materialize"
      role="region"
      aria-labelledby="payment-review-title"
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          ref={heading}
          tabIndex={-1}
          id="payment-review-title"
          aria-label={ready ? undefined : "Review payment details"}
          className="text-sm font-bold outline-none text-slate-900 dark:text-white"
        >
          {ready
            ? formatCurrency(review.amount, review.currency || "USD")
            : hasInlineCheckout
              ? "Checkout"
              : "Review payment details"}
        </h3>

        {hasInlineCheckout && (
          <div className="flex items-center gap-2">
            {itemCount > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            )}
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(effectiveTotal, review?.currency || "INR")}
            </span>
          </div>
        )}
      </div>

      {hasInlineCheckout ? (
        <div className="mt-3 space-y-2.5">
          {/* Minimal Payment Selector with Highlighted PayPal */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPayMethod("PAYPAL")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                payMethod === "PAYPAL"
                  ? "bg-[#0070ba] text-white border-[#0070ba] ring-2 ring-[#ffc439]/70 shadow-sm"
                  : "bg-[#0070ba]/10 text-[#0070ba] dark:text-[#38bdf8] border-[#0070ba]/30 hover:bg-[#0070ba]/20"
              }`}
            >
              <span className="inline-flex items-center justify-center size-4 rounded bg-[#ffc439] text-[#003087] font-black text-[10px] leading-none">
                P
              </span>
              PayPal
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("COD")}
              className={`flex items-center justify-center py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                payMethod === "COD"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"
              }`}
            >
              COD
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("WALLET")}
              className={`flex items-center justify-center py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                payMethod === "WALLET"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"
              }`}
            >
              Wallet
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm">{review.recipient || "Recipient not provided"}</p>
          <p className="mt-1.5 text-xs text-muted-foreground break-words">{review.prompt}</p>
          <p role="status" className="mt-2 text-[11px] text-muted-foreground">
            {ready ? "Tap to confirm." : "Approve below."}
          </p>
        </>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>

        <div className="flex items-center gap-1.5">
          {hasInlineCheckout && (
            <Button
              size="sm"
              disabled={busy}
              className={`font-bold shadow-sm cursor-pointer ${
                payMethod === "PAYPAL"
                  ? "bg-[#0070ba] hover:bg-[#005ea6] text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
              onClick={async () => {
                if (typeof onPlaceInlineOrder === "function") {
                  const res = await onPlaceInlineOrder({
                    payMethod,
                    total: effectiveTotal,
                  });
                  if (res && res.id) {
                    setPlacedOrder({
                      id: res.id,
                      payMethod: res.payment_method || payMethod,
                      total: Number(res.total_amount || effectiveTotal).toFixed(2),
                    });
                  }
                }
              }}
            >
              {payMethod === "PAYPAL" ? "Pay with PayPal" : "Place Order"}
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
              className={hasInlineCheckout ? "text-xs px-2 text-muted-foreground" : ""}
              aria-label="Open payment details"
              onClick={onOpen}
            >
              {hasInlineCheckout ? "Full" : "Open payment details"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
