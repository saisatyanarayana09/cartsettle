import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Sparkles,
  ShieldCheck,
  Clock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Tag,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const formatPrice = (val) => {
  const num = Number(val) || 0;
  return `\u20B9${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function DealCard({
  decision = {},
  currency = "INR",
  onAccept,
  onCounter,
  onDecline,
  busy = false,
}) {
  const reduced = useReducedMotion();
  const [isAccepted, setIsAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showAllLines, setShowAllLines] = useState(false);

  // Normalize pricing data
  const originalTotal = Number(
    decision.original_total ??
      decision.original_price ??
      (decision.item?.price ? decision.item.price * (decision.item.quantity || 1) : 0)
  );

  const dealTotal = Number(
    decision.deal_total ?? decision.final_price ?? decision.counter_price ?? 0
  );

  const savings = Number(
    decision.savings ?? (originalTotal > dealTotal ? originalTotal - dealTotal : 0)
  );

  const savingsPct = Number(
    decision.savings_pct ??
      decision.counter_discount_pct ??
      decision.discount_approved_pct ??
      (originalTotal > 0 ? (((originalTotal - dealTotal) / originalTotal) * 100).toFixed(1) : 0)
  );

  const status = decision.status || "APPROVED";
  const isApproved = status === "APPROVED";
  const isFloor = status === "ALREADY_BEST";
  const isCounter = status === "COUNTER_OFFER";
  const lines = Array.isArray(decision.lines) ? decision.lines : [];
  const title = decision.product || (lines.length > 1 ? `Basket Bundle (${lines.length} items)` : "Negotiated Deal");

  // 10-minute hold countdown
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (decision.expires_at) {
      const diff = Math.floor((new Date(decision.expires_at).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return 600; // 10 minutes default
  });

  useEffect(() => {
    if (isAccepted) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAccepted]);

  const isExpired = secondsLeft <= 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const handleAccept = async () => {
    if (isExpired || isAccepted || isAccepting || busy) return;
    try {
      setIsAccepting(true);
      if (onAccept) {
        await onAccept(decision);
      }
      setIsAccepted(true);
    } catch (err) {
      console.error("Failed to accept deal:", err);
    } finally {
      setIsAccepting(false);
    }
  };

  // Quick counter suggestions if counter-offer
  const counterSuggestions = useMemo(() => {
    if (!isCounter || isAccepted || isExpired) return [];
    const suggestions = [];
    if (dealTotal > 50) {
      const lowerRound = Math.floor(dealTotal / 50) * 50;
      if (lowerRound > 0 && lowerRound < dealTotal) {
        suggestions.push(`Can you do ${formatPrice(lowerRound)}?`);
      }
    }
    const target5Below = Math.round(dealTotal - 10);
    if (target5Below > 0 && target5Below < dealTotal && !suggestions.includes(`Can you do ${formatPrice(target5Below)}?`)) {
      suggestions.push(`How about ${formatPrice(target5Below)}?`);
    }
    return suggestions.slice(0, 2);
  }, [isCounter, isAccepted, isExpired, dealTotal]);

  return (
    <motion.div
      layout={reduced ? false : "position"}
      initial={reduced ? false : { opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`relative w-full rounded-2xl border overflow-hidden shadow-lg transition-all ${
        isApproved
          ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 via-white to-white dark:via-slate-900/90 dark:to-slate-900/95"
          : isCounter
          ? "border-amber-500/30 bg-gradient-to-b from-amber-500/5 via-white to-white dark:via-slate-900/90 dark:to-slate-900/95"
          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
      }`}
    >
      {/* Top Banner / Security Badge */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck
            className={`size-4 shrink-0 ${
              isApproved
                ? "text-emerald-600 dark:text-emerald-400"
                : isCounter
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500"
            }`}
          />
          <span className="text-[11px] font-bold tracking-tight text-slate-800 dark:text-slate-200 truncate">
            {isApproved
              ? "Deal Approved"
              : isCounter
              ? "Counter-Offer"
              : "Best Price"}
          </span>
        </div>

        {/* Hold Countdown Badge */}
        <div
          className={`flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
            isExpired
              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
              : isAccepted
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              : secondsLeft < 120
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 animate-pulse"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {isAccepted ? (
            <>
              <Check className="size-3 text-emerald-600" />
              <span>Locked</span>
            </>
          ) : isExpired ? (
            <>
              <AlertCircle className="size-3 text-rose-600" />
              <span>Expired</span>
            </>
          ) : (
            <>
              <Clock className="size-3 text-slate-500" />
              <span>{formattedTime}</span>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 space-y-3">
        {/* Product / Bundle Headline & Hero Pricing */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
              {title}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isApproved
                ? "Offer approved"
                : isCounter
                ? "Best price available"
                : "Lowest price available"}
            </p>
          </div>

          <div className="text-right shrink-0">
            {originalTotal > dealTotal && (
              <div className="text-[11px] text-slate-400 line-through font-mono">
                {formatPrice(originalTotal)}
              </div>
            )}
            <div className="text-[18px] font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {formatPrice(dealTotal)}
            </div>
          </div>
        </div>

        {/* Savings Badge */}
        {savings > 0 && (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold">
              <Tag className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>You save {formatPrice(savings)}</span>
            </div>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {savingsPct > 0 ? `${savingsPct}% OFF` : "Discounted"}
            </span>
          </div>
        )}

        {/* Line Items Breakdown (Collapsible if > 1 items) */}
        {lines.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Items in bundle ({lines.length})</span>
              {lines.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowAllLines((prev) => !prev)}
                  className="flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {showAllLines ? "Show less" : `View all ${lines.length}`}
                  {showAllLines ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
              )}
            </div>

            <div className="space-y-1 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 p-2 border border-slate-200/60 dark:border-slate-800/60">
              {(showAllLines ? lines : lines.slice(0, 2)).map((line, idx) => (
                <div key={line.product_id || idx} className="flex items-center justify-between text-[11.5px] py-0.5">
                  <div className="truncate mr-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{line.product_name}</span>
                    <span className="text-slate-400 ml-1">×{line.quantity}</span>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    {line.catalog_unit > line.deal_unit && (
                      <span className="text-[10px] text-slate-400 line-through mr-1">
                        {formatPrice(line.catalog_unit)}
                      </span>
                    )}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatPrice(line.deal_unit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Counter Offer Chips */}
        {counterSuggestions.length > 0 && !isAccepted && (
          <div className="pt-1">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
              Counter Offer
            </div>
            <div className="flex flex-wrap gap-1.5">
              {counterSuggestions.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onCounter && onCounter(text)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/20 transition-colors cursor-pointer"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-1.5 flex items-center gap-2">
          {isAccepted ? (
            <div className="w-full py-2 px-3 rounded-xl bg-emerald-600 text-white flex items-center justify-center gap-1.5 text-xs font-bold shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="size-4" />
              <span>Deal Locked · {formatPrice(dealTotal)} applied</span>
            </div>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleAccept}
                disabled={isExpired || isAccepting || busy}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs h-9 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAccepting ? (
                  <div className="flex items-center gap-1.5">
                    <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Applying...</span>
                  </div>
                ) : isExpired ? (
                  <span>Deal Expired</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Check className="size-3.5" />
                    <span>Accept ({formatPrice(dealTotal)})</span>
                  </div>
                )}
              </Button>

              {onDecline && !isExpired && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDecline}
                  disabled={isAccepting || busy}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs h-9 rounded-xl px-3 cursor-pointer"
                >
                  Decline
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default DealCard;
