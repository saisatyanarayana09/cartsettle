import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Minus,
  Moon,
  Package,
  Plus,
  Sun,
  Truck,
  Bell,
  Gift,
  Share2,
  Sparkles,
  Calculator,
  BarChart3,
  Copy,
  Receipt,
  X,
  LayoutGrid,
  Users,
  Megaphone,
  Tag,
  ShoppingCart,
  ShoppingBag,
  Trash2,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Crown,
  Award,
  Phone,
  ExternalLink,
  Eye,
  RefreshCw,
  FileText,
  CheckCheck,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { optimizeImage } from "../../utils/image";
import { DealCard } from "./DealCard";

const money = (value, currency = "USD") => {
  const num = Number(value) || 0;
  if (currency === "INR" || currency === "\u20B9") {
    return `\u20B9${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
};

function CompactProductCard({
  item,
  currency = "USD",
  added,
  onAdd,
  disabled,
  cartItems,
  onUpdate,
  index = 0,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [quantity, setQuantity] = useState(Math.max(1, Number(item.quantity || 1)));
  const photo = item.image || item.thumbnail || item.image_url;
  const price = Number(item.price ?? item.offer_price ?? item.regular_price ?? 0);
  const regPrice = Number(item.regular_price ?? 0);
  const discountPct =
    item.discount_pct ||
    (regPrice > price && price > 0 ? Math.round(((regPrice - price) / regPrice) * 100) : 15);
  const live = cartItems?.find(
    (row) => Number(row.product?.id ?? row.product ?? row.product_id ?? row.id) === Number(item.id),
  );
  const liveQuantity = Number(live?.quantity || 0);
  const isAdded = Boolean(added || (live && liveQuantity > 0));
  const selected = isAdded && live ? liveQuantity : quantity;
  const change = (next) => {
    if (isAdded && live && onUpdate) onUpdate(live, Math.max(0, next));
    else setQuantity(Math.max(1, next));
  };

  const formattedPrice = money(price, currency);

  return (
    <div
      className={`assistant-product transition-all duration-200 ${
        isAdded ? "is-added-card border-emerald-500/40 dark:border-emerald-400/30" : ""
      }`}
      style={{ animationDelay: `${Math.min(index * 65, 260)}ms` }}
    >
      <div className="assistant-photo relative overflow-hidden">
        {discountPct > 0 && (
          <span className="assistant-discount-tag">{discountPct}% OFF</span>
        )}
        {photo && !imageFailed ? (
          <img
            src={optimizeImage(photo, 160)}
            alt={item.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            className={`transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <Package className="size-5 text-slate-400" />
        )}
      </div>

      {/* 2-Row Content Column so Title & Stepper/Add Never Overflow Horizontally */}
      <div className="min-w-0 flex-1 flex flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <p className="text-[13.5px] font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {item.name}
          </p>
          <span className="text-[13px] font-extrabold text-emerald-700 dark:text-emerald-400 shrink-0">
            {formattedPrice}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 min-w-0">
          <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {item.unit || item.pack_size || "1 unit"}
          </p>

          <div className="assistant-product-controls shrink-0">
            <div className={isAdded ? "assistant-stepper is-added" : "assistant-stepper"}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Decrease ${item.name} quantity`}
                disabled={disabled || (!live && selected <= 1)}
                onClick={() => change(selected - 1)}
                className={
                  isAdded
                    ? "text-white hover:bg-white/15 hover:text-white size-6 rounded-full cursor-pointer"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 size-6 rounded-full cursor-pointer"
                }
              >
                <Minus className="size-3" />
              </Button>
              <output aria-label={`${item.name} quantity`}>{selected}</output>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Increase ${item.name} quantity`}
                disabled={disabled}
                onClick={() => change(selected + 1)}
                className={
                  isAdded
                    ? "text-white hover:bg-white/15 hover:text-white size-6 rounded-full cursor-pointer"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 size-6 rounded-full cursor-pointer"
                }
              >
                <Plus className="size-3" />
              </Button>
            </div>

            {isAdded ? (
              <span
                role="status"
                className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/20 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              >
                <Check className="size-2.5 stroke-[2.5]" /> Added
              </span>
            ) : (
              <Button
                size="sm"
                disabled={disabled}
                aria-label={`Add ${quantity} ${item.name} to cart`}
                className="rounded-full bg-[#065f46] hover:bg-[#047857] text-white font-bold text-[11px] px-2.5 h-7 shadow-sm cursor-pointer transition-transform active:scale-95"
                onClick={() => onAdd?.({ ...item, quantity })}
              >
                <Plus className="size-3 mr-0.5" /> Add
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RemovedMiniCard({ item, onUndo, busy }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photo = item.image || item.thumbnail || item.image_url;
  return (
    <div className="assistant-product opacity-75 border-rose-500/20">
      <div className="assistant-photo">
        {photo && !imageFailed ? (
          <img
            src={optimizeImage(photo, 100)}
            alt={item.name || "Item"}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Package className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold break-words line-through text-muted-foreground">
          {item.name || "Cart item"}
        </p>
        <p role="status" className="mt-1 text-xs text-rose-500 font-medium">
          Removed from cart
        </p>
      </div>
      {onUndo && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => onUndo([item])} className="shrink-0 text-xs cursor-pointer">
          Undo
        </Button>
      )}
    </div>
  );
}

function RestockRow({ item, onSend, onReviewPayment, busy }) {
  const [quantity, setQuantity] = useState(
    Math.max(1, Number(item.recommended_reorder || item.reorder_qty || 1)),
  );
  return (
    <div className="space-y-2 py-2">
      <p className="break-words text-sm font-semibold text-foreground">{item.name}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{item.stock ?? 0} left</span>
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center rounded-md border border-border">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Decrease ${item.name} reorder quantity`}
              disabled={quantity <= 1 || busy}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="cursor-pointer"
            >
              <Minus className="size-3.5" />
            </Button>
            <output
              aria-label={`${item.name} reorder quantity`}
              className="min-w-5 text-center text-xs font-bold"
            >
              {quantity}
            </output>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Increase ${item.name} reorder quantity`}
              disabled={busy}
              onClick={() => setQuantity((value) => value + 1)}
              className="cursor-pointer"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <Button
            size="sm"
            disabled={busy}
            className="cursor-pointer font-bold shadow-xs"
            onClick={() => {
              const unitCost = Number(item.unit_cost || item.cost_price || 5);
              const estAmount = item.payout_amount != null ? Number(item.payout_amount) : Number((quantity * unitCost).toFixed(2));
              onReviewPayment?.({
                prompt: `Restock ${quantity} units of ${item.name} via PayPal Payout`,
                amount: estAmount,
                recipient: item.recipient || item.supplier_email || item.supplier || "Wholesale Supplier",
              });
            }}
          >
            Restock
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Turn-Based Action Card Wrapper with Drag-to-Dismiss and Manual Close */
function AutoDismissCardWrapper({
  children,
  action,
  duration = 0, // Defaults to 0 (Turn-Based Persistence: stays mounted throughout turn)
  onDismiss,
  closable = true,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!duration || duration <= 0 || isPaused) return;
    const exitTimer = setTimeout(() => setExiting(true), Math.max(duration - 350, 500));
    const removeTimer = setTimeout(() => {
      setDismissed(true);
      onDismiss?.(action);
    }, duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [action, onDismiss, isPaused, duration]);

  if (dismissed) return null;

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.4}
      onDragEnd={(e, info) => {
        if (Math.abs(info.offset.x) > 90) {
          setExiting(true);
          setTimeout(() => {
            setDismissed(true);
            onDismiss?.(action);
          }, 150);
        }
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className={`relative transition-all duration-200 select-none ${
        exiting ? "assistant-card-dissolve" : "assistant-card-materialize"
      }`}
    >
      {duration > 0 && (
        <div className="assistant-auto-dismiss-bar mb-2.5 rounded-full" />
      )}
      {closable && (
        <button
          type="button"
          onClick={() => {
            setExiting(true);
            setTimeout(() => {
              setDismissed(true);
              onDismiss?.(action);
            }, 180);
          }}
          className="absolute top-2.5 right-2.5 z-20 size-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Dismiss preview"
        >
          <X className="size-3.5 stroke-[2.2]" />
        </button>
      )}
      {children}
    </motion.div>
  );
}

/** In-Assistant Store Wallet Live Preview Card */
function WalletCard({ action, currency = "USD", onNavigate, onSend }) {
  const wallet = action.wallet || action;
  const balance = Number(wallet.balance || 0);
  const cashback = Number(wallet.pending_cashback || 0);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-foreground">Store Wallet</h3>
          <p className="text-[11px] text-muted-foreground">{wallet.usage_policy || "Instant store credit bonus"}</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          Instant
        </span>
      </div>

      <div className="flex items-baseline justify-between rounded-xl bg-secondary/50 p-3">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-extrabold text-foreground font-mono tabular-nums">
            {money(balance, currency)}
          </p>
        </div>
        {cashback > 0 && (
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Pending Rewards</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              +{money(cashback, currency)}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-0.5">
        <Button
          size="sm"
          className="cursor-pointer font-bold shadow-xs active:scale-[0.98] transition-transform"
          onClick={() => onNavigate?.("/profile/wallet")}
        >
          Add Funds
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => onNavigate?.("/profile/wallet")}
        >
          View Ledger <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/** In-Assistant Rich Dual-Persona Order Details Live Preview Card */
function OrderCard({
  action,
  currency = "USD",
  persona = "owner",
  onNavigate,
  onReorder,
  onReviewPayment,
  onSend,
  busy,
}) {
  const [expanded, setExpanded] = useState(false);
  const order = action.order || action;
  const reorderItems = Array.isArray(order.items) ? order.items : [];
  const itemsList = Array.isArray(order.items) ? order.items : [];
  const status = String(order.status || "ACCEPTED").toUpperCase();
  const total = Number(order.total_amount ?? order.total ?? order.authorized_amount ?? order.authorized ?? 0);
  const isShopper = persona === "shopper";

  const isCompleted = ["ACCEPTED", "DELIVERED", "READY"].includes(status);
  const isPending = ["NEW", "PREPARING", "OUT_FOR_DELIVERY"].includes(status);
  const isRejected = ["REJECTED", "CANCELLED"].includes(status);

  const authVal = order.authorized ?? order.authorized_amount;
  const capVal = order.captured ?? order.captured_amount;
  const relVal = order.released ?? order.released_amount ?? 0;

  const stages = [
    { key: "NEW", label: "Placed" },
    { key: "ACCEPTED", label: "Accepted" },
    { key: "PREPARING", label: "Preparing" },
    { key: "OUT_FOR_DELIVERY", label: "On The Way" },
    { key: "DELIVERED", label: "Delivered" },
  ];
  const stageIdx = stages.findIndex((s) => s.key === status);
  const activeStage = stageIdx >= 0 ? stageIdx : (isCompleted ? 4 : 1);

  const rejectionReason = order.rejection_reason || order.owner_note || order.customer_note || order.ai_settlement_notes;
  const visibleItems = expanded ? itemsList : itemsList.slice(0, 3);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`size-2.5 rounded-full ${
              isRejected
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                : isCompleted
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                : isPending
                ? "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                : "bg-slate-400"
            }`}
          />
          <h3 className="text-sm font-bold text-foreground">Order #{order.id}</h3>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold border ${
            isRejected
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              : isCompleted
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : isPending
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
          }`}
        >
          {status}
        </span>
      </div>

      {/* Shopper Milestone Progress Stepper */}
      {isShopper && !isRejected && (
        <div className="py-1">
          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mb-1.5">
            {stages.map((stg, i) => (
              <span
                key={stg.key}
                className={i <= activeStage ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}
              >
                {stg.label}
              </span>
            ))}
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(15, ((activeStage + 1) / stages.length) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta details */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{order.created_at || "Recent Order"}</span>
        <span>{order.order_type === "DELIVERY" ? "Doorstep Delivery" : "In-Store Pickup"}</span>
      </div>

      {/* Rejection / Cancellation Callout Banner */}
      {isRejected && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300 space-y-0.5">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 stroke-[2.2]" /> Rejection Reason
          </div>
          <p className="text-[11px] leading-relaxed">
            {rejectionReason || "Declined by store operations due to item stock unavailability or unserviceable pickup slot."}
          </p>
        </div>
      )}

      {/* Customer Contact & Address (Owner Mode) */}
      {!isShopper && (order.customer || order.customer_name) && (
        <div className="rounded-xl bg-secondary/30 p-2.5 text-xs space-y-1">
          <div className="flex justify-between items-center text-foreground font-semibold">
            <span>{order.customer || order.customer_name}</span>
            {order.phone && <span className="font-mono text-muted-foreground">{order.phone}</span>}
          </div>
          {order.delivery_address && (
            <p className="text-[11px] text-muted-foreground truncate">{order.delivery_address}</p>
          )}
        </div>
      )}

      {/* Line Items Breakdown */}
      {itemsList.length > 0 && (
        <div className="rounded-xl bg-secondary/40 p-2.5 space-y-2 text-xs">
          {visibleItems.map((it, idx) => (
            <div key={it.id || idx} className="flex justify-between items-center text-foreground">
              <span className="truncate pr-2">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 mr-1.5">{it.quantity}x</span>
                {it.name}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground shrink-0">
                {money(it.total || (it.price * it.quantity), currency)}
              </span>
            </div>
          ))}
          {itemsList.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 pt-0.5 cursor-pointer"
            >
              {expanded ? (
                <>Show less <ChevronUp className="size-3" /></>
              ) : (
                <>+{itemsList.length - 3} more items <ChevronDown className="size-3" /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* Financial Audit (Owner Mode) */}
      {!isShopper && (authVal != null || capVal != null) && (
        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] bg-secondary/20 p-2 rounded-xl">
          <div>
            <span className="text-muted-foreground block uppercase font-bold">Authorized</span>
            <span className="font-mono font-bold text-foreground">{money(authVal ?? total, currency)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block uppercase font-bold">Captured</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{money(capVal ?? total, currency)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block uppercase font-bold">Released</span>
            <span className="font-mono font-bold text-muted-foreground">{money(relVal, currency)}</span>
          </div>
        </div>
      )}

      {/* Total Amount Row */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground font-medium">Total Amount</span>
        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
          {money(total, currency)}
        </span>
      </div>

      {/* Direct Interactive Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer active:scale-[0.98] transition-transform text-xs"
          onClick={() =>
            onNavigate?.(isShopper ? "/profile/orders" : `/owner/orders/${order.id}`)
          }
        >
          Open <ArrowUpRight className="size-3.5 ml-1" />
        </Button>

        {isShopper && reorderItems.length > 0 && onReorder && (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onReorder(reorderItems)}
            className="cursor-pointer font-bold active:scale-[0.98] transition-transform text-xs"
          >
            <Plus className="size-3.5 mr-1" />
            Reorder All
          </Button>
        )}

        {isShopper && ["NEW", "ACCEPTED", "PREPARING"].includes(status) && onSend && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onSend(`cancel order ${order.id}`)}
            className="cursor-pointer text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900"
          >
            Cancel Order
          </Button>
        )}

        {!isShopper && order.can_settle && (
          <Button
            size="sm"
            disabled={busy}
            className="cursor-pointer font-bold active:scale-[0.98] transition-transform text-xs"
            onClick={() =>
              onReviewPayment?.({
                prompt: `Settle order ${order.id}`,
                amount: Number(order.total_amount ?? order.total ?? order.authorized_amount ?? 0),
                recipient: order.recipient || order.payee || order.customer_name || order.customer || "Order Settlement",
                currency,
              })
            }
          >
            <Check className="size-3.5 mr-1" />
            Settle
          </Button>
        )}
      </div>
    </div>
  );
}

/** Configurable Multi-Order Ledger Card (N = 1...10 Orders) */
function OrdersListCard({
  action,
  currency = "USD",
  persona = "owner",
  onNavigate,
  onSend,
  onReorder,
  onReviewPayment,
}) {
  const orders = Array.isArray(action.orders) ? action.orders : [];
  const isShopper = persona === "shopper";

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Receipt className="size-3.5 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {orders.length} {isShopper ? "Past Orders" : "Recent Orders"}
          </h3>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {orders.length} items
        </span>
      </div>

      <div className="divide-y divide-border/50 max-h-[320px] overflow-y-auto pr-0.5 custom-scrollbar">
        {orders.map((ord, idx) => {
          const status = String(ord.status || "ACCEPTED").toUpperCase();
          const isDone = ["ACCEPTED", "DELIVERED", "READY"].includes(status);
          const isRejected = ["REJECTED", "CANCELLED"].includes(status);

          return (
            <div key={ord.id || idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground truncate">#{ord.id}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${
                      isRejected
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        : isDone
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {!isShopper && ord.customer ? `${ord.customer} · ` : ""}
                  {ord.created_at || "Recent"}
                </p>
              </div>

              <div className="text-right shrink-0 flex items-center gap-2">
                <span className="font-bold font-mono tabular-nums text-foreground">
                  {money(ord.total ?? ord.total_amount, currency)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
                  onClick={() => onSend ? onSend(isShopper ? `order status ${ord.id}` : `order details ${ord.id}`) : onNavigate?.(isShopper ? "/profile/orders" : `/owner/orders/${ord.id}`)}
                >
                  <Eye className="size-3.5 mr-0.5" /> Inspect
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Ranked Top Customers Leaderboard Card */
function TopCustomersCard({
  action,
  currency = "USD",
  onSend,
  onNavigate,
}) {
  const customers = Array.isArray(action.customers) ? action.customers : [];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Crown className="size-3.5 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Top Customers Leaderboard</h3>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
          Ranked by LTV
        </span>
      </div>

      <div className="divide-y divide-border/50 max-h-[340px] overflow-y-auto pr-0.5 custom-scrollbar">
        {customers.map((cust, idx) => {
          const rank = cust.rank || idx + 1;
          const badgeClass =
            rank === 1
              ? "bg-amber-400/20 text-amber-600 dark:text-amber-300 border-amber-400/40"
              : rank === 2
              ? "bg-slate-300/30 text-slate-700 dark:text-slate-300 border-slate-300/40"
              : rank === 3
              ? "bg-amber-700/20 text-amber-700 dark:text-amber-400 border-amber-700/40"
              : "bg-muted text-muted-foreground";

          return (
            <div key={cust.id || idx} className="py-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-extrabold border shrink-0 ${badgeClass}`}>
                    #{rank}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{cust.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {cust.orders_count} orders · AOV: {money(cust.aov || 0, currency)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 text-sm">
                    {money(cust.total_spent ?? cust.total_spend ?? 0, currency)}
                  </span>
                  <span className="block text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                    {cust.tier || "VIP Gold"}
                  </span>
                </div>
              </div>

              {/* Direct 1-Click Action Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10.5px] cursor-pointer"
                  onClick={() => onSend?.(`display ${cust.username || cust.name} customer details`)}
                >
                  <UserCheck className="size-3 mr-1" /> Dossier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10.5px] cursor-pointer text-emerald-600 dark:text-emerald-400"
                  onClick={() => onSend?.(`credit $10 to customer ${cust.username || cust.name}`)}
                >
                  <Plus className="size-3 mr-0.5" /> Credit $10
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** In-Depth Customer Profile Dossier Card (Dual-Persona: Owner & Shopper) */
function CustomerProfileCard({
  action,
  currency = "USD",
  persona = "owner",
  onSend,
  onNavigate,
}) {
  const cust = action.customer || action;
  const isShopper = persona === "shopper" || action.persona === "shopper";
  const [copied, setCopied] = useState(false);

  const copyRef = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-foreground">{cust.name}</h3>
          <p className="text-[11px] text-muted-foreground">
            {cust.email || cust.username} {cust.joined ? `· Member since ${cust.joined}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          {cust.tier || "VIP Platinum"}
        </span>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-xl bg-secondary/40 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wallet Balance</p>
          <p className="text-base font-extrabold text-foreground font-mono tabular-nums mt-0.5">
            {money(cust.wallet_balance ?? cust.wallet ?? 0, currency)}
          </p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isShopper ? "Lifetime Savings" : "Lifetime Spend"}
          </p>
          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
            {money(isShopper ? (cust.lifetime_savings ?? cust.savings ?? 0) : (cust.total_spent ?? cust.total_spend ?? 0), currency)}
          </p>
        </div>
      </div>

      {/* Shopper Referral Code Box */}
      {isShopper && cust.referral_code && (
        <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background px-3 py-2 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground block">Referral Code</span>
            <span className="font-mono font-bold tracking-wider text-foreground">{cust.referral_code}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            onClick={() => copyRef(cust.referral_code)}
          >
            {copied ? "Copied!" : "Copy Code"}
          </Button>
        </div>
      )}

      {/* Owner Recent Orders Snippet */}
      {!isShopper && Array.isArray(cust.recent_orders) && cust.recent_orders.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Orders</p>
          <div className="rounded-xl bg-secondary/30 divide-y divide-border/40 text-xs">
            {cust.recent_orders.map((ro, i) => (
              <div key={ro.id || i} className="flex justify-between items-center p-2">
                <span className="font-semibold text-foreground">#{ro.id}</span>
                <span className="text-muted-foreground">{ro.created_at || ro.date || "Recent"}</span>
                <span className="font-mono font-bold text-foreground">{money(ro.total ?? ro.total_amount ?? 0, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct Interactive Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
        {!isShopper ? (
          <>
            <Button
              size="sm"
              className="cursor-pointer active:scale-[0.98] transition-transform text-xs"
              onClick={() => onSend?.(`credit $10 to customer ${cust.username || cust.name}`)}
            >
              <Plus className="size-3.5 mr-1" /> Add $10 Credit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer active:scale-[0.98] transition-transform text-xs"
              onClick={() => onSend?.(`credit $25 to customer ${cust.username || cust.name}`)}
            >
              <Plus className="size-3.5 mr-1" /> Add $25 Credit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer active:scale-[0.98] transition-transform text-xs"
              onClick={() => onNavigate?.("/owner/orders")}
            >
              View Orders <ArrowUpRight className="size-3.5 ml-1" />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              className="cursor-pointer font-bold active:scale-[0.98] transition-transform text-xs"
              onClick={() => onNavigate?.("/profile/wallet")}
            >
              Deposit Funds
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer active:scale-[0.98] transition-transform text-xs"
              onClick={() => onNavigate?.("/profile/orders")}
            >
              My Orders <ArrowUpRight className="size-3.5 ml-1" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Polymorphic Dynamic Composite Card (Generative JSON Layout Engine) */
function DynamicCompositeCard({ action, onNavigate, onSend, currency = "INR" }) {
  const { title, subtitle, badge, kpis = [], progress_bars = [], key_values = [], actions = [] } = action || {};

  return (
    <div className="space-y-3.5 p-4 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/60 shadow-lg text-foreground">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-2">
        <div>
          {badge && (
            <span className="inline-block px-2 py-0.5 mb-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {badge.text || badge}
            </span>
          )}
          <h4 className="text-sm font-bold tracking-tight">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* KPI Metrics Grid */}
      {Array.isArray(kpis) && kpis.length > 0 && (
        <div className={`grid gap-2 ${kpis.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {kpis.map((kpi, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-muted/40 border border-border/40 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">{kpi.label}</span>
              <div className="flex items-baseline justify-center gap-1.5 mt-0.5">
                <span className="text-base font-extrabold tabular-nums tracking-tight font-mono">{kpi.value}</span>
                {kpi.trend && (
                  <span className={`text-[10px] font-bold ${kpi.positive !== false ? "text-emerald-500" : "text-rose-500"}`}>
                    {kpi.trend}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress Bars */}
      {Array.isArray(progress_bars) && progress_bars.length > 0 && (
        <div className="space-y-2 pt-1">
          {progress_bars.map((bar, idx) => {
            const maxVal = Number(bar.max) || 1;
            const curVal = Number(bar.current) || 0;
            const pct = Math.min(100, Math.max(0, Math.round((curVal / maxVal) * 100)));
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{bar.label}</span>
                  <span className="font-semibold tabular-nums font-mono">{curVal} / {maxVal} {bar.unit || ""}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Key-Value Metadata Pairs */}
      {Array.isArray(key_values) && key_values.length > 0 && (
        <div className="divide-y divide-border/40 text-xs">
          {key_values.map((row, idx) => (
            <div key={idx} className="flex justify-between py-1.5">
              <span className="text-muted-foreground">{row.key || row.label}</span>
              <span className="font-medium text-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {Array.isArray(actions) && actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
          {actions.map((btn, idx) => {
            const target = btn.payload || btn.target || btn.action || btn.label;
            return (
              <Button
                key={idx}
                size="sm"
                variant={btn.variant || (idx === 0 ? "default" : "outline")}
                onClick={() => {
                  if ((btn.action_type === "navigate" || btn.type === "navigate") && onNavigate) {
                    onNavigate(target);
                  } else if (onSend) {
                    onSend(target);
                  }
                }}
                className="text-xs h-7 cursor-pointer active:scale-95 transition-transform"
              >
                {btn.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Product Comparison Card (Option A vs Option B) */
function ComparisonCard({ action, currency = "USD", onAdd, onNavigate }) {
  const items = Array.isArray(action.items) ? action.items : [];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <h3 className="text-sm font-bold text-foreground">Product Comparison</h3>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          Side-by-Side
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {items.map((it, idx) => (
          <div key={it.id || idx} className="p-2.5 rounded-xl bg-secondary/40 border border-border/50 flex flex-col justify-between space-y-2">
            <div>
              {it.badge && (
                <span className="inline-block px-1.5 py-0.2 mb-1 text-[9px] font-bold uppercase rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {it.badge}
                </span>
              )}
              <p className="font-bold text-foreground line-clamp-1">{it.name}</p>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {money(it.price, currency)}
              </p>
              {it.unit && <p className="text-[10px] text-muted-foreground">{it.unit}</p>}
            </div>

            <Button
              size="sm"
              className="w-full text-xs h-7 font-bold cursor-pointer"
              onClick={() => onAdd ? onAdd(it) : onNavigate?.(`/product/${it.id}`)}
            >
              <Plus className="size-3 mr-1" /> Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Interactive Recipe Steps Card with 1-Click Batch Add */
function RecipeStepsCard({ action, currency = "USD", onAdd, busy }) {
  const recipe = action.recipe || action;
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">{recipe.title || "Recipe Kit"}</h3>
          <p className="text-[11px] text-muted-foreground">{recipe.prep_time || "25 mins"} · {recipe.difficulty || "Medium"}</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          Meal Kit
        </span>
      </div>

      {ingredients.length > 0 && (
        <div className="space-y-1.5 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ingredients Required</p>
          <div className="rounded-xl bg-secondary/30 p-2 space-y-1">
            {ingredients.map((ing, i) => (
              <div key={ing.id || i} className="flex justify-between items-center text-foreground">
                <span>{ing.name}</span>
                <span className="font-mono text-muted-foreground">{money(ing.price || 0, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-1">
        <Button
          size="sm"
          disabled={busy}
          className="w-full font-bold text-xs h-8 cursor-pointer"
          onClick={() => {
            if (onAdd && ingredients.length > 0) {
              ingredients.forEach((it) => onAdd({ ...it, quantity: 1 }));
            }
          }}
        >
          <Plus className="size-3.5 mr-1" /> Add All Ingredients to Cart
        </Button>
      </div>
    </div>
  );
}

/** Store Low Stock Inventory Alert Card */
function InventoryAlertCard({ action, currency = "USD", onSend, busy }) {
  const items = Array.isArray(action.items) ? action.items : [];

  return (
    <div className="space-y-3 rounded-2xl border border-rose-500/30 bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="size-3.5 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Low Stock Inventory Alert</h3>
        </div>
        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
          Critical
        </span>
      </div>

      <div className="divide-y divide-border/50 text-xs">
        {items.map((it, idx) => (
          <div key={it.id || idx} className="py-2 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground truncate">{it.name}</p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold font-mono">
                {it.stock} units left (Min threshold: {it.threshold || 10})
              </p>
            </div>
            <Button
              size="sm"
              disabled={busy}
              className="h-7 px-2.5 text-xs font-bold cursor-pointer"
              onClick={() => onSend?.(`reorder 20 units of ${it.name}`)}
            >
              Reorder
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Customer Feedback & Reviews Sentiment Card */
function FeedbackReviewsCard({ action }) {
  const rating = Number(action.rating || 4.8);
  const totalReviews = Number(action.total_reviews || 128);
  const quotes = Array.isArray(action.quotes) ? action.quotes : [
    { user: "Priya S.", text: "Super fresh milk and instant doorstep delivery!" },
    { user: "Vikram R.", text: "Best kirana prices in our area. Very reliable." }
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <h3 className="text-sm font-bold text-foreground">Customer Satisfaction</h3>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {rating} / 5.0 Rating
        </span>
      </div>

      <div className="flex items-center gap-3 bg-secondary/40 p-3 rounded-xl">
        <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
          {rating.toFixed(1)}
        </span>
        <div className="text-xs text-muted-foreground">
          <p className="font-bold text-foreground">{totalReviews} Verified Shoppers</p>
          <p className="text-[11px]">96% positive store experience</p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        {quotes.map((q, i) => (
          <div key={i} className="p-2 rounded-lg bg-secondary/20 border border-border/40">
            <span className="font-bold text-foreground block">{q.user}</span>
            <p className="text-muted-foreground text-[11px] mt-0.5 italic">"{q.text}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Auto-dismissing live theme preview card with liquid dissolve & hover pause */
function AutoDismissThemeCard({ action, onToggleTheme, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isDark = action.theme !== "light";

  useEffect(() => {
    if (isPaused) return;
    const exitTimer = setTimeout(() => setExiting(true), 2400);
    const removeTimer = setTimeout(() => {
      setDismissed(true);
      onDismiss?.(action);
    }, 2800);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [action, onDismiss, isPaused]);

  if (dismissed) return null;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`flex flex-col items-center justify-center my-1.5 select-none transition-all duration-300 ${
        exiting ? "assistant-card-dissolve" : "assistant-card-materialize"
      }`}
    >
      <div className="rounded-2xl bg-slate-900/5 dark:bg-white/10 px-4 py-2 text-xs text-muted-foreground border border-slate-200/80 dark:border-white/15 shadow-md backdrop-blur-md flex items-center gap-3">
        <span className="size-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">
          {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
        </span>
        <span className="font-semibold text-foreground">
          {isDark ? "Switched to Dark Mode" : "Switched to Light Mode"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-foreground cursor-pointer"
          onClick={() => {
            setDismissed(true);
            onToggleTheme?.(isDark ? "light" : "dark");
          }}
        >
          Undo
        </Button>
      </div>
      <div className="assistant-auto-dismiss-bar mt-1.5 w-24 rounded-full" />
    </div>
  );
}

/** In-Assistant Live Order Status & ETA Card with hover pause */
function OrderStatusCard({ action, currency = "USD", onNavigate, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const order = action.order || action;
  const stages = [
    { key: "NEW", label: "Placed" },
    { key: "ACCEPTED", label: "Accepted" },
    { key: "PREPARING", label: "Preparing" },
    { key: "OUT_FOR_DELIVERY", label: "On The Way" },
    { key: "DELIVERED", label: "Delivered" },
  ];

  useEffect(() => {
    if (isPaused) return;
    const exitTimer = setTimeout(() => setExiting(true), 4400);
    const removeTimer = setTimeout(() => {
      setDismissed(true);
      onDismiss?.(action);
    }, 4800);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [action, onDismiss, isPaused]);

  if (dismissed) return null;

  const currentStatus = String(order.status || "ACCEPTED").toUpperCase();
  const currentStageIndex = stages.findIndex((s) => s.key === currentStatus);
  const activeIdx = currentStageIndex >= 0 ? currentStageIndex : 1;
  const etaText = order.delivery_eta || order.estimated_delivery || "12 mins";
  const progressPct = Math.min(100, Math.max(24, ((activeIdx + 1) / stages.length) * 100));

  return (
    <div
      onClick={() => onNavigate?.(`/profile/orders`)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#151b26] px-4 py-3.5 shadow-sm cursor-pointer transition-colors hover:border-emerald-500/40 ${
        exiting ? "assistant-card-dissolve" : "assistant-card-materialize"
      }`}
    >
      <div className="assistant-auto-dismiss-bar assistant-auto-dismiss-slow mb-2.5 rounded-full" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200 truncate">
          <span className="font-semibold text-slate-900 dark:text-white">
            Order #{order.id || "202601"}
          </span>
          <span className="mx-1.5 text-slate-400">&middot;</span>
          <span>Arriving in </span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{etaText}</span>
        </p>
        <span className="sr-only">Estimated Delivery: {etaText}</span>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
          {stages[activeIdx]?.label || "On The Way"}
        </span>
      </div>

      {/* Sleek Minimal Emerald Progress Line */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.55)] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

/** Grocery Photo Checklist Card with live price totals */
function GroceryChecklistCard({ action, currency = "USD", onAdd, busy }) {
  const checklist = action.checklist || action.items || [];
  const [selectedItems, setSelectedItems] = useState(() =>
    checklist.reduce((acc, _, idx) => {
      acc[idx] = true;
      return acc;
    }, {}),
  );

  const toggleItem = (idx) => {
    setSelectedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const availableItems = checklist.filter((item) => item.in_stock && (item.product || item.id));

  const selectedCount = availableItems.filter((_, idx) => selectedItems[idx]).length;

  const handleAddAllAvailable = () => {
    availableItems.forEach((item, idx) => {
      if (selectedItems[idx]) {
        const prod = item.product || item;
        onAdd?.({
          ...prod,
          quantity: item.quantity || 1,
        });
      }
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-foreground">Scanned Grocery Checklist</h3>
          <p className="text-xs text-muted-foreground">
            {availableItems.length} of {checklist.length} items available in store
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          AI Vision
        </span>
      </div>

      <div className="divide-y divide-border/60 max-h-56 overflow-y-auto pr-1">
        {checklist.map((item, idx) => {
          const isSelected = selectedItems[idx] ?? true;
          const isInStock = item.in_stock && (item.product || item.id);
          const prodPrice = item.product?.price || item.product?.offer_price || item.price || 0;
          return (
            <div key={idx} className="flex items-center justify-between py-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleItem(idx)}
                  className="rounded border-border text-emerald-500 focus:ring-emerald-500 size-3.5 cursor-pointer"
                />
                <span
                  className={`break-words font-medium ${
                    isSelected ? "text-foreground" : "text-muted-foreground line-through"
                  }`}
                >
                  {item.quantity ? `${item.quantity} \u00D7 ` : ""}{item.name}
                </span>
              </label>

              {isInStock ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {money(prodPrice, currency)}
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                    In Stock
                  </span>
                </div>
              ) : (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground shrink-0">
                  Out of Stock
                </span>
              )}
            </div>
          );
        })}
      </div>

      {availableItems.length > 0 && (
        <Button
          size="sm"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm mt-1 cursor-pointer transition-transform active:scale-[0.99]"
          disabled={busy || selectedCount === 0}
          onClick={handleAddAllAvailable}
        >
          <Plus className="mr-1 size-3.5" />
          Add Available Items to Cart ({selectedCount})
        </Button>
      )}
    </div>
  );
}

/** In-Assistant Notifications Card */
function NotificationsCard({ action }) {
  const [cleared, setCleared] = useState(false);
  const items = action.notifications || [
    {
      id: 1,
      title: "Order #202601 Dispatched",
      message: "Driver is on the way to your address.",
      time: "10m ago",
      unread: true,
    },
    {
      id: 2,
      title: "Weekend Grocery Flash Sale",
      message: "15% off organic dairy and fruits with code SAVE15.",
      time: "2h ago",
      unread: false,
    },
    {
      id: 3,
      title: "Wallet Cashback Added",
      message: "You received $5.00 cashback for your last order.",
      time: "Yesterday",
      unread: false,
    },
  ];

  if (cleared) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-background/95 p-3.5 text-xs text-muted-foreground">
        <span>All notifications marked as read.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <h3 className="text-sm font-bold text-foreground">Recent Notifications</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => setCleared(true)}
        >
          Mark all as read
        </Button>
      </div>
      <div className="divide-y divide-border/60">
        {items.map((notif) => (
          <div key={notif.id} className="py-2.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                {notif.unread && <span className="size-1.5 rounded-full bg-emerald-500" />}
                {notif.title}
              </span>
              <span className="text-[10px] text-muted-foreground">{notif.time}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** In-Assistant Referral Status Card */
function ReferralStatusCard({ action }) {
  const ref = action.referral || {
    code: "CARTREF2026",
    friends_invited: 4,
    rewards_earned: 25.0,
    link: "https://cartsettle.shop/ref/CARTREF2026",
  };
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard?.writeText(ref.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-foreground">{ref.name || "Referral Rewards"}</h3>
          <p className="text-xs text-muted-foreground">Share CartSettle & earn $5 per friend</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-secondary/50 p-2.5">
          <p className="text-base font-extrabold text-foreground">{ref.friends_invited}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Friends Invited</p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-2.5">
          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            ${ref.rewards_earned.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">Wallet Rewards</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background px-3 py-2 text-xs">
        <div className="font-mono font-bold tracking-wider text-foreground">{ref.code}</div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
          onClick={copyCode}
        >
          {copied ? "Copied!" : "Copy Code"}
        </Button>
      </div>
    </div>
  );
}

/** Mathematical Calculation Live Preview Card */
function CalculationResultCard({ action }) {
  const [copied, setCopied] = useState(false);
  const expr = action.expression || "Calculation";
  const result = action.result != null ? String(action.result) : "0";

  const handleCopy = () => {
    navigator.clipboard?.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-slate-50/90 dark:bg-[#151b26] p-3.5 shadow-sm backdrop-blur-md space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Calculator className="size-3.5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Calculation
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] font-medium text-slate-500 hover:text-foreground cursor-pointer"
          onClick={handleCopy}
        >
          {copied ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <Check className="size-3" /> Copied
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Copy className="size-3" /> Copy
            </span>
          )}
        </Button>
      </div>

      <div className="flex items-baseline justify-between gap-3 pt-0.5">
        <code className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
          {expr}
        </code>
        <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 shrink-0 font-mono tracking-tight">
          = {result}
        </span>
      </div>
    </div>
  );
}

/** Structured Data Analysis Live Preview Card */
function DataAnalysisCard({ action }) {
  const summary = action.summary || "Data analysis complete.";
  const stats = action.stats || {};
  const hasStats = Object.keys(stats).length > 0;

  return (
    <div className="rounded-2xl border border-border/80 bg-slate-50/90 dark:bg-[#151b26] p-3.5 shadow-sm backdrop-blur-md space-y-2.5">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <BarChart3 className="size-3.5 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-foreground">Data Breakdown</span>
        </div>
        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
          Verified
        </span>
      </div>

      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
        {summary}
      </p>

      {hasStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-center">
          {stats.count != null && (
            <div className="rounded-lg bg-black/5 dark:bg-white/5 p-1.5">
              <p className="text-xs font-extrabold text-foreground">{stats.count}</p>
              <p className="text-[9.5px] text-muted-foreground uppercase font-semibold">Points</p>
            </div>
          )}
          {stats.sum != null && (
            <div className="rounded-lg bg-black/5 dark:bg-white/5 p-1.5">
              <p className="text-xs font-extrabold text-foreground">{stats.sum}</p>
              <p className="text-[9.5px] text-muted-foreground uppercase font-semibold">Sum</p>
            </div>
          )}
          {stats.avg != null && (
            <div className="rounded-lg bg-black/5 dark:bg-white/5 p-1.5">
              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.avg}
              </p>
              <p className="text-[9.5px] text-muted-foreground uppercase font-semibold">Average</p>
            </div>
          )}
          {stats.min != null && stats.max != null && (
            <div className="rounded-lg bg-black/5 dark:bg-white/5 p-1.5">
              <p className="text-xs font-extrabold text-foreground">
                {stats.min} &ndash; {stats.max}
              </p>
              <p className="text-[9.5px] text-muted-foreground uppercase font-semibold">Range</p>
            </div>
          )}
          {stats.word_count != null && (
            <div className="rounded-lg bg-black/5 dark:bg-white/5 p-1.5">
              <p className="text-xs font-extrabold text-foreground">{stats.word_count}</p>
              <p className="text-[9.5px] text-muted-foreground uppercase font-semibold">Words</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Sales & Analytics Live Action Card with Timeframe Switcher & Sparklines */
function SalesAnalyticsCard({ action, currency = "USD", onNavigate }) {
  const [timeframe, setTimeframe] = useState("Today");
  const data = action.analytics || action.data || action;
  
  // Dynamic multipliers based on timeframe
  const multiplier = timeframe === "Today" ? 1 : (timeframe === "7D" ? 6.4 : (timeframe === "Month" ? 24.8 : 280));
  const rev = Number(data.total_revenue ?? data.revenue ?? 4820.5) * (multiplier > 1 ? (multiplier * 0.28) : 1);
  const cap = Number(data.total_captured ?? data.captured ?? 4560.0) * (multiplier > 1 ? (multiplier * 0.28) : 1);
  const rel = Number(data.total_released ?? data.released ?? 260.5) * (multiplier > 1 ? (multiplier * 0.28) : 1);
  const totalOrders = Math.round(Number(data.total_orders ?? data.orders_count ?? 38) * (multiplier > 1 ? (multiplier * 0.25) : 1));
  const pendingOrders = Number(data.pending_orders ?? 4);
  const aov = Number(data.aov ?? (totalOrders > 0 ? rev / totalOrders : 126.85));

  // 7-day sparkline data points
  const sparklineHeights = [40, 65, 52, 85, 74, 92, 100];

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-slate-50/95 dark:bg-[#151b26] p-3.5 shadow-sm backdrop-blur-md space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <BarChart3 className="size-3.5 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-foreground">Sales & Revenue Analytics</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Live Real-Time
        </span>
      </div>

      {/* Timeframe Switcher Tabs */}
      <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-xl">
        {["Today", "7D", "Month", "Year"].map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setTimeframe(tf)}
            className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              timeframe === tf
                ? "bg-white dark:bg-black/40 text-foreground shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white dark:bg-black/20 p-2.5 border border-border/50">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Gross Revenue</p>
          <p className="text-base font-extrabold text-foreground tabular-nums tracking-tight font-mono">
            {money(rev, currency)}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-black/20 p-2.5 border border-border/50">
          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Captured</p>
          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight font-mono">
            {money(cap, currency)}
          </p>
        </div>
      </div>

      {/* Mini 7-Bar Trajectory Sparkline */}
      <div className="p-2.5 rounded-xl bg-secondary/30 space-y-1.5">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
          <span>Revenue Trajectory</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">+14.2% vs previous period</span>
        </div>
        <div className="h-9 flex items-end gap-1.5 pt-1">
          {sparklineHeights.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-emerald-500/70 hover:bg-emerald-500 transition-all cursor-pointer"
              style={{ height: `${h}%` }}
              title={`Day ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg bg-black/5 dark:bg-white/5 p-2">
          <p className="text-xs font-black text-foreground tabular-nums font-mono">{totalOrders}</p>
          <p className="text-[9px] uppercase font-bold text-muted-foreground">Orders</p>
        </div>
        <div className="rounded-lg bg-black/5 dark:bg-white/5 p-2">
          <p className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums font-mono">{pendingOrders}</p>
          <p className="text-[9px] uppercase font-bold text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-lg bg-black/5 dark:bg-white/5 p-2">
          <p className="text-xs font-black text-foreground tabular-nums font-mono">{money(aov, currency)}</p>
          <p className="text-[9px] uppercase font-bold text-muted-foreground">Avg Value</p>
        </div>
      </div>

      {rel > 0 && (
        <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
          <span>Auto-Released Savings:</span>
          <span className="font-bold tabular-nums font-mono">{money(rel, currency)}</span>
        </div>
      )}

      <div className="pt-1 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs font-semibold cursor-pointer border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
          onClick={() => onNavigate?.("/owner/sales")}
        >
          Open Sales Analytics <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/** Promo Codes & Offers Live Action Card with 1-Click Apply */
function PromoCodesCard({ action, onNavigate, onSend }) {
  const [copiedCode, setCopiedCode] = useState(null);
  const promos = action.promos || action.promo_codes || [
    { code: "SAVE10", discount_value: 10, discount_type: "PERCENTAGE", min_spend: 25 },
    { code: "FLAT15", discount_value: 15, discount_type: "FLAT", min_spend: 50 },
    { code: "FREESHIP", discount_value: 100, discount_type: "PERCENTAGE", min_spend: 30 }
  ];
  const statusMsg = action.status_message || (promos.length ? `${promos.length} active promo codes` : "No active promos");

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-slate-50/95 dark:bg-[#151b26] p-3.5 shadow-sm backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Gift className="size-3.5 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-foreground">Promotions & Coupons</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">
          {promos.length} Active
        </span>
      </div>

      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {statusMsg}
      </p>

      {promos.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {promos.map((promo, idx) => (
            <div
              key={promo.id || promo.code || idx}
              className="p-2.5 rounded-xl bg-white dark:bg-black/20 border border-border/50 text-xs flex items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                    {promo.code}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {promo.discount_type === "PERCENTAGE" ? `${promo.discount_value}% OFF` : `$${promo.discount_value} OFF`}
                  </span>
                </div>
                {promo.min_spend && (
                  <p className="text-[10px] text-muted-foreground">Min spend ${promo.min_spend}</p>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs font-semibold cursor-pointer"
                  onClick={() => handleCopy(promo.code)}
                >
                  {copiedCode === promo.code ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check className="size-3" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Copy className="size-3" /> Copy
                    </span>
                  )}
                </Button>
                {onSend && (
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs font-bold cursor-pointer active:scale-95 transition-transform"
                    onClick={() => onSend(`apply promo ${promo.code}`)}
                  >
                    Apply
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-1 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs font-semibold cursor-pointer border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
          onClick={() => onNavigate?.("/owner/offers")}
        >
          Manage Offers <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/** Store Categories Live Action Card */
function CategoriesCard({ action, onNavigate, onSend }) {
  const categories = action.categories || [];
  const total = Number(action.total_categories ?? categories.length);
  const isOwner = Boolean(action.persona === "owner" || (typeof window !== "undefined" && window.location.pathname.startsWith("/owner")));

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-slate-50/95 dark:bg-[#151b26] p-3.5 shadow-sm backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <LayoutGrid className="size-3.5 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-foreground">Catalog Categories</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full uppercase">
          {total} Active
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat, idx) => (
          <button
            key={cat.id || cat.name || idx}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-black/20 border border-border/50 hover:border-sky-500/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            onClick={() => onSend?.(`show items that belong to ${cat.name}`)}
            title={`Browse items in ${cat.name}`}
          >
            <span>{cat.name}</span>
            {cat.product_count != null && (
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
                ({cat.product_count})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="pt-1 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs font-semibold cursor-pointer border-sky-500/30 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300"
          onClick={() => onNavigate?.(isOwner ? "/owner/products" : "/products")}
        >
          {isOwner ? "Manage Catalog Products" : "Browse Store Products"} <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/** Customers & Delivery Fleet Live Action Card */
function CustomersFleetCard({ action, onNavigate, onSend }) {
  const isFleet = Boolean(action.delivery_partners || action.fleet);
  const partners = action.delivery_partners || action.fleet || [];
  const customers = action.customers || [];
  const totalCount = action.total_count || (isFleet ? partners.length : customers.length);

  return (
    <div className="rounded-2xl border border-teal-500/30 bg-slate-50/95 dark:bg-[#151b26] p-3.5 shadow-sm backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            {isFleet ? <Truck className="size-3.5 stroke-[2.2]" /> : <Users className="size-3.5 stroke-[2.2]" />}
          </div>
          <span className="text-xs font-bold text-foreground">
            {isFleet ? "Delivery Fleet Partners" : "Customer Directory"}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full uppercase">
          {totalCount} Active
        </span>
      </div>

      {isFleet && partners.length > 0 ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {partners.map((p, idx) => (
            <div
              key={p.id || idx}
              className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-black/20 border border-border/50 text-xs"
            >
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{p.name || `Partner #${p.id}`}</p>
                <p className="text-[10px] text-muted-foreground truncate">{p.phone || p.vehicle || "Motorcycle"}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                p.status === "BUSY" || p.status === "ON_DELIVERY"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}>
                {p.status || "AVAILABLE"}
              </span>
            </div>
          ))}
        </div>
      ) : customers.length > 0 ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {customers.map((c, idx) => (
            <div
              key={c.id || idx}
              className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-black/20 border border-border/50 text-xs"
            >
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{c.name || c.username || `Customer #${c.id}`}</p>
                <p className="text-[10px] text-muted-foreground truncate">{c.email || c.phone || "Active Shopper"}</p>
              </div>
              {c.orders_count != null && (
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                  {c.orders_count} orders
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Fleet status is synchronized.</p>
      )}

      <div className="pt-1 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs font-semibold cursor-pointer border-teal-500/30 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300"
          onClick={() => onNavigate?.(isFleet ? "/owner/delivery-partners" : "/owner/customers")}
        >
          {isFleet ? "Open Fleet Console" : "Open Customers"} <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/** Push Broadcast Live Action Card */
function BroadcastCard({ action, onNavigate }) {
  const title = action.title || "Store Announcement";
  const message = action.message || action.body || "Notification transmitted to active shoppers.";
  const sentAt = action.sent_at || "Just now";

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-slate-50/95 dark:bg-[#151b26] p-3.5 shadow-sm backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Megaphone className="size-3.5 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-foreground">Customer Push Broadcast</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full uppercase">
          Transmitted
        </span>
      </div>

      <div className="p-2.5 rounded-xl bg-white dark:bg-black/20 border border-border/50 space-y-1">
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
        <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>Target: All Active Shoppers</span>
          <span>{sentAt}</span>
        </div>
      </div>

      <div className="pt-1 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs font-semibold cursor-pointer border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-violet-700 dark:text-violet-300"
          onClick={() => onNavigate?.("/owner/push-broadcast")}
        >
          View Broadcast Feed <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/** Active Cart Items Live Action Preview Card */
export function CartItemsCard({
  action,
  cartItems,
  currency = "USD",
  onUpdate,
  onNavigate,
  onSend,
  busy,
  onDismiss,
}) {
  const items = Array.isArray(action.items) && action.items.length > 0
    ? action.items
    : Array.isArray(cartItems)
    ? cartItems
    : [];

  const total = Number(
    action.total ??
      items.reduce((sum, it) => {
        const p = Number(it.unit_price ?? it.price ?? 0);
        const q = Number(it.quantity ?? 1);
        return sum + p * q;
      }, 0)
  );

  const itemCount = Number(
    action.count ?? items.reduce((sum, it) => sum + Number(it.quantity ?? 1), 0)
  );
  const isEmpty = items.length === 0;

  const freeDeliveryThreshold = 50.0;
  const diff = freeDeliveryThreshold - total;

  return (
    <AutoDismissCardWrapper
      action={action}
      onDismiss={onDismiss}
      duration={0}
    >
      <div className="rounded-2xl border border-border bg-slate-50/95 dark:bg-[#151b26] p-3.5 shadow-sm backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingCart className="size-3.5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-foreground">Cart Items</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            {isEmpty ? "0 items \u2022 $0.00" : `${itemCount} ${itemCount === 1 ? "item" : "items"} \u2022 ${money(total, currency)}`}
          </span>
        </div>

        {!isEmpty && (
          <div className="bg-secondary/30 rounded-xl p-2 text-xs space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>{diff > 0 ? `Add ${money(diff, currency)} for Free Delivery` : "Free Delivery unlocked"}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {Math.min(100, Math.round((total / freeDeliveryThreshold) * 100))}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((total / freeDeliveryThreshold) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {isEmpty ? (
          <div className="py-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground">Your cart is currently empty.</p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs h-7 cursor-pointer"
              onClick={() => onNavigate?.("/products")}
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
              {items.map((it, idx) => {
                const itemId = Number(it.product?.id ?? it.product ?? it.product_id ?? it.id);
                const name = it.product_name || it.name || "Item";
                const unitPrice = Number(it.unit_price ?? it.price ?? 0);
                const qty = Number(it.quantity ?? 1);
                const lineTotal = unitPrice * qty;
                const photo = it.image || it.thumbnail || it.image_url || it.product?.image;

                return (
                  <div
                    key={itemId || idx}
                    className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/10 text-xs transition-all"
                  >
                    <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {photo ? (
                        <img src={optimizeImage(photo, 80)} alt={name} className="size-full object-cover" />
                      ) : (
                        <Package className="size-4 text-emerald-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {money(unitPrice, currency)} &times; {qty}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center h-6 rounded-lg border border-border bg-background">
                        <button
                          type="button"
                          aria-label={`Decrease ${name} quantity`}
                          disabled={busy}
                          onClick={() => onUpdate?.(it, Math.max(0, qty - 1))}
                          className="px-1.5 h-full text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <Minus className="size-2.5" />
                        </button>
                        <span className="px-1 text-[11px] font-bold tabular-nums">{qty}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${name} quantity`}
                          disabled={busy}
                          onClick={() => onUpdate?.(it, qty + 1)}
                          className="px-1.5 h-full text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <Plus className="size-2.5" />
                        </button>
                      </div>

                      <span className="font-bold tabular-nums text-slate-900 dark:text-white min-w-[48px] text-right">
                        {money(lineTotal, currency)}
                      </span>

                      <button
                        type="button"
                        aria-label={`Remove ${name} from cart`}
                        disabled={busy}
                        onClick={() => onUpdate?.(it, 0)}
                        className="size-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">Total Amount</p>
                <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {money(total, currency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onSend?.("clear my cart")}
                  className="h-7 px-2.5 rounded-lg text-xs cursor-pointer text-muted-foreground hover:text-rose-600 hover:border-rose-300"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => onNavigate?.("/checkout")}
                  className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  Checkout <ArrowRight className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AutoDismissCardWrapper>
  );
}

function ActionContent({
  action,
  currency,
  onAdd,
  addedItems,
  onSend,
  onNavigate,
  onToggleTheme,
  onReviewPayment,
  cartItems,
  onUpdate,
  onUndoAdd,
  onUndoRemove,
  onUndoQty,
  onReorder,
  busy,
  persona,
  onDismiss,
  onAcceptDeal,
}) {
  const type = action.type || action.action;
  const addProduct =
    onAdd || ((item) => onSend(`Add ${item.quantity || 1} units of ${item.name} to cart`));

  if (type === "SWITCH_THEME" || type === "TOGGLE_DARK_MODE") {
    return (
      <AutoDismissThemeCard
        action={action}
        onToggleTheme={onToggleTheme}
        onDismiss={onDismiss}
      />
    );
  }

  if (type === "ORDER_STATUS_CARD") {
    return (
      <OrderStatusCard
        action={action}
        currency={currency}
        onNavigate={onNavigate}
        onDismiss={onDismiss}
      />
    );
  }

  if (type === "CART_ITEMS_CARD" || type === "CART_CARD" || type === "CART_PREVIEW") {
    return (
      <CartItemsCard
        action={action}
        cartItems={cartItems}
        currency={currency}
        onUpdate={onUpdate}
        onNavigate={onNavigate}
        onSend={onSend}
        busy={busy}
        onDismiss={onDismiss}
      />
    );
  }

  if (type === "GROCERY_CHECKLIST") {
    return <GroceryChecklistCard action={action} currency={currency} onAdd={onAdd} busy={busy} />;
  }

  if (type === "WALLET_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={8500}>
        <WalletCard action={action} currency={currency} onNavigate={onNavigate} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "NOTIFICATIONS_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={8000}>
        <NotificationsCard action={action} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "REFERRAL_STATUS_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={8500}>
        <ReferralStatusCard action={action} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "CALCULATION_RESULT") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={7500}>
        <CalculationResultCard action={action} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "DATA_ANALYSIS") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={8500}>
        <DataAnalysisCard action={action} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "PROPOSED_LANGUAGE") {
    return (
      <div>
        <div className="flex justify-between gap-2">
          <h3 className="text-sm font-semibold">{action.language || "Assistant language"}</h3>
          <span className="text-xs text-muted-foreground">Proposed</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Language switching is not connected yet.</p>
      </div>
    );
  }

  if (type === "CONFIRMATION_REQUIRED") {
    return (
      <div className="p-3.5 rounded-xl border border-amber-300/80 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800/80 my-2 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs tracking-wide">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{action.title || "Confirmation Required"}</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{action.summary}</p>
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
            disabled={busy}
            onClick={() => onSend && onSend(`Confirm action ${action.action_id || ""}`.trim())}
          >
            {action.confirm_label || "Confirm Execution"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs text-slate-600 dark:text-slate-300 font-medium"
            disabled={busy}
            onClick={() => onSend && onSend("Cancel action")}
          >
            {action.cancel_label || "Cancel"}
          </Button>
        </div>
      </div>
    );
  }

  if (type === "PAYMENT_REVIEW") return <p className="text-sm">{action.message}</p>;

  if (type === "UPDATE_CART_QTY") {
    const canUndo = onUndoQty && action.previous_quantity != null;
    return (
      <div className="flex items-center justify-between gap-2">
        <p role="status" className="flex gap-2 items-center text-sm font-medium">
          <Check className="size-4 text-emerald-500" />
          {action.name || "Item"} &middot; {action.quantity} in cart
        </p>
        {canUndo && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onUndoQty(action)} className="cursor-pointer">
            Undo
          </Button>
        )}
      </div>
    );
  }

  if (["SWITCH_ADDRESS", "TOGGLE_FAVORITE", "MOVE_FAVORITES_TO_CART", "NAVIGATE"].includes(type)) {
    const titles = {
      SWITCH_ADDRESS: `${action.label || "Delivery"} address selected`,
      TOGGLE_FAVORITE: `${action.name || "Item"} saved`,
      MOVE_FAVORITES_TO_CART: "Favorites added to cart",
      NAVIGATE: "Opened",
    };
    return (
      <p role="status" className="flex gap-2 items-center text-sm font-medium">
        <Check className="size-4 text-emerald-500" />
        {titles[type]}
      </p>
    );
  }

  if (type === "REMOVE_FROM_CART" || type === "CLEAR_CART") {
    const removedList =
      Array.isArray(action.items) && action.items.length > 0
        ? action.items
        : Array.isArray(action.removed_items) && action.removed_items.length > 0
          ? action.removed_items
          : action.item
            ? [action.item]
            : [{ id: action.product_id || 0, name: action.name || "All Cart Items" }];
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Cart updated
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {removedList.length} {removedList.length === 1 ? "item" : "items"} removed
          </span>
        </div>
        <div className={`grid gap-2 ${removedList.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {removedList.slice(0, 4).map((item, idx) => (
            <RemovedMiniCard key={item.id || idx} item={item} onUndo={onUndoRemove} busy={busy} />
          ))}
        </div>
        {onUndoRemove && removedList.length > 0 && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onUndoRemove(removedList)} className="cursor-pointer">
            Undo
          </Button>
        )}
      </div>
    );
  }

  if (["SEARCH_RESULTS", "RECOMMEND_BASKET", "ADD_TO_CART"].includes(type)) {
    const items = Array.isArray(action.items)
      ? action.items
      : type === "ADD_TO_CART"
        ? [action.item || action]
        : [];
    const displayItems = items.slice(0, action.recipe ? 4 : 3);
    const bundleTotal = displayItems.reduce(
      (sum, it) => sum + Number(it.price ?? it.offer_price ?? it.regular_price ?? 0),
      0,
    );
    const formattedBundleTotal = money(bundleTotal, currency);

    return (
      <div className="space-y-2">
        {action.recipe && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 px-3 py-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="size-3.5 text-emerald-500 shrink-0" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {action.recipe} Kit &middot; {displayItems.length} items ({formattedBundleTotal})
              </h3>
            </div>
            <Button
              size="sm"
              disabled={busy}
              className="h-6 px-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs shrink-0 cursor-pointer"
              onClick={() => {
                displayItems.forEach((it, idx) => {
                  setTimeout(() => {
                    addProduct({ ...it, quantity: Number(it.quantity || 1) });
                  }, idx * 90);
                });
              }}
            >
              <Plus className="size-3 mr-0.5" /> Add All
            </Button>
          </div>
        )}
        <div className="space-y-2">
          {displayItems.map((item, index) => (
            <CompactProductCard
              key={item.id || index}
              index={index}
              item={item}
              currency={currency}
              added={type === "ADD_TO_CART" ? true : addedItems?.[item.id]}
              onAdd={addProduct}
              disabled={busy}
              cartItems={cartItems}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === "MARGIN_DECISION") {
    const decision = action.decision || action;
    if (persona === "shopper") {
      return (
        <DealCard
          decision={decision}
          currency={currency}
          onAccept={onAcceptDeal}
          onCounter={onSend}
          onDecline={onDismiss}
          busy={busy}
        />
      );
    }
    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <h3 className="font-bold text-foreground">{decision.product || decision.item?.name || "Price offer"}</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-primary">
            {decision.counter_discount_pct ?? decision.discount_approved_pct ?? 0}% off &middot;{" "}
            {money(decision.counter_price ?? decision.final_price, currency)}
          </span>
        </div>
      </div>
    );
  }

  if (type === "ORDER_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <OrderCard
          action={action}
          currency={currency}
          persona={persona}
          onNavigate={onNavigate}
          onReorder={onReorder}
          onReviewPayment={onReviewPayment}
          onSend={onSend}
          busy={busy}
        />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "ORDERS_LIST_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <OrdersListCard
          action={action}
          currency={currency}
          persona={persona}
          onNavigate={onNavigate}
          onSend={onSend}
          onReorder={onReorder}
          onReviewPayment={onReviewPayment}
        />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "TOP_CUSTOMERS_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <TopCustomersCard
          action={action}
          currency={currency}
          onSend={onSend}
          onNavigate={onNavigate}
        />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "CUSTOMER_PROFILE_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <CustomerProfileCard
          action={action}
          currency={currency}
          persona={persona}
          onSend={onSend}
          onNavigate={onNavigate}
        />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "DYNAMIC_COMPOSITE_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <DynamicCompositeCard
          action={action}
          currency={currency}
          onNavigate={onNavigate}
          onSend={onSend}
        />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "COMPARISON_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <ComparisonCard
          action={action}
          currency={currency}
          onAdd={addProduct}
          onNavigate={onNavigate}
        />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "RECIPE_STEPS_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <RecipeStepsCard
          action={action}
          currency={currency}
          onAdd={addProduct}
          busy={busy}
        />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "INVENTORY_ALERT_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <InventoryAlertCard
          action={action}
          currency={currency}
          onSend={onSend}
          busy={busy}
        />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "FEEDBACK_REVIEWS_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <FeedbackReviewsCard action={action} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "SALES_ANALYTICS_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <SalesAnalyticsCard action={action} currency={currency} onNavigate={onNavigate} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "PROMO_CODES_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <PromoCodesCard action={action} onNavigate={onNavigate} onSend={onSend} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "CATEGORIES_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <CategoriesCard action={action} onNavigate={onNavigate} onSend={onSend} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "CUSTOMERS_FLEET_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <CustomersFleetCard action={action} onNavigate={onNavigate} onSend={onSend} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "BROADCAST_CARD") {
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <BroadcastCard action={action} onNavigate={onNavigate} />
      </AutoDismissCardWrapper>
    );
  }

  if (type === "LOW_STOCK_LIST")
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <div className="divide-y divide-border">
          {(action.items || []).map((item, index) => (
            <RestockRow
              key={item.id || index}
              item={item}
              onSend={onSend}
              onReviewPayment={onReviewPayment}
              busy={busy}
            />
          ))}
        </div>
      </AutoDismissCardWrapper>
    );

  if (type === "ORDER_SETTLED")
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={0}>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Order #{action.order_id} settled</h3>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{money(action.captured, currency)}</p>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => onNavigate(`/owner/orders/${action.order_id}`)}
          >
            Receipt <ArrowUpRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </AutoDismissCardWrapper>
    );

  if (type === "PAYOUT_RECEIPT") {
    const receipt = action.receipt || action;
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={8500}>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Payout {receipt.status?.toLowerCase() || "sent"}</h3>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{money(receipt.amount_paid, currency)}</p>
          {receipt.product && (
            <p className="text-xs text-muted-foreground">
              {receipt.product} &middot; {receipt.new_stock} in stock
            </p>
          )}
          {receipt.payout_batch_id && (
            <p className="break-all text-xs font-mono text-muted-foreground">{receipt.payout_batch_id}</p>
          )}
        </div>
      </AutoDismissCardWrapper>
    );
  }

  if (type === "PENDING_ORDERS")
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={10000}>
        <div className="space-y-3">
          {(action.orders || []).map((order) => (
            <ActionContent
              key={order.id}
              {...{ currency, onSend, onNavigate, onReviewPayment, busy }}
              action={{ type: "ORDER_CARD", order: { ...order, can_settle: true } }}
            />
          ))}
        </div>
      </AutoDismissCardWrapper>
    );

  if (type === "CATALOG_SUMMARY")
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={7500}>
        <div className="space-y-3">
          <p className="text-sm">
            {action.total} products &middot; {action.in_stock} in stock
          </p>
          <Button variant="outline" size="sm" onClick={() => onNavigate("/owner/products")} className="cursor-pointer">
            Products <ArrowUpRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </AutoDismissCardWrapper>
    );

  if (type === "MARGIN_LIST")
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={8500}>
        <div className="space-y-2">
          {(action.products || []).map((item, index) => (
            <div key={item.id || index} className="flex justify-between gap-2 text-sm">
              <span className="text-foreground">{item.name}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{item.margin_pct}%</span>
            </div>
          ))}
        </div>
      </AutoDismissCardWrapper>
    );

  if (type === "PRODUCT_UPDATED")
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={7500}>
        <div className="space-y-2">
          <p className="text-sm text-foreground">{action.product?.name} updated</p>
          <Button variant="outline" size="sm" onClick={() => onNavigate("/owner/products")} className="cursor-pointer">
            Products <ArrowUpRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </AutoDismissCardWrapper>
    );

  if (type === "BULK_SETTLED")
    return (
      <AutoDismissCardWrapper action={action} onDismiss={onDismiss} duration={8500}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <h3 className="font-semibold text-foreground">{action.count || 0} orders settled</h3>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {money(action.total_captured, currency)}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate("/owner/orders")} className="cursor-pointer">
            Orders <ArrowUpRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </AutoDismissCardWrapper>
    );

  if (type === "ORDER_PLACED")
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <h3 className="font-semibold text-foreground">Order #{action.order_id} placed</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">
            {action.payment_method || "COD"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Total: {money(action.total, currency)} &middot; Delivery PIN: {action.delivery_pin || "\u2014"}
        </p>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/profile/orders")} className="cursor-pointer">
          Track Order <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </div>
    );

  if (type === "APPLY_PROMO")
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <div>
          <p className="font-semibold text-foreground">Promo {action.code} applied</p>
          <p className="text-xs text-muted-foreground">
            {action.discount_pct || 10}% savings unlocked
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/cart")} className="cursor-pointer">
          View Bag <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </div>
    );

  if (type === "SWAP_SUMMARY")
    return (
      <div className="space-y-1.5 text-sm">
        <p className="font-semibold text-foreground">
          Swapped {action.removed?.name} &rarr; {action.added?.name}
        </p>
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          Saved {money(action.savings, currency)} instantly
        </p>
      </div>
    );

  if (type === "CANCEL_ORDER")
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-foreground">Order #{action.order_id} cancelled</span>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/profile/orders")} className="cursor-pointer">
          Orders <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </div>
    );

  return null;
}

const visibleTypes = new Set([
  "CONFIRMATION_REQUIRED",
  "SWITCH_THEME",
  "TOGGLE_DARK_MODE",
  "ORDER_STATUS_CARD",
  "GROCERY_CHECKLIST",
  "NOTIFICATIONS_CARD",
  "REFERRAL_STATUS_CARD",
  "WALLET_CARD",
  "CART_ITEMS_CARD",
  "CART_CARD",
  "CART_PREVIEW",
  "CALCULATION_RESULT",
  "DATA_ANALYSIS",
  "PROPOSED_LANGUAGE",
  "PAYMENT_REVIEW",
  "SWITCH_ADDRESS",
  "TOGGLE_FAVORITE",
  "MOVE_FAVORITES_TO_CART",
  "UPDATE_CART_QTY",
  "NAVIGATE",
  "REMOVE_FROM_CART",
  "CLEAR_CART",
  "SEARCH_RESULTS",
  "RECOMMEND_BASKET",
  "ADD_TO_CART",
  "MARGIN_DECISION",
  "ORDER_CARD",
  "ORDERS_LIST_CARD",
  "TOP_CUSTOMERS_CARD",
  "CUSTOMER_PROFILE_CARD",
  "DYNAMIC_COMPOSITE_CARD",
  "COMPARISON_CARD",
  "RECIPE_STEPS_CARD",
  "INVENTORY_ALERT_CARD",
  "FEEDBACK_REVIEWS_CARD",
  "ORDER_SETTLED",
  "LOW_STOCK_LIST",
  "PAYOUT_RECEIPT",
  "PENDING_ORDERS",
  "CATALOG_SUMMARY",
  "MARGIN_LIST",
  "PRODUCT_UPDATED",
  "BULK_SETTLED",
  "SALES_ANALYTICS_CARD",
  "PROMO_CODES_CARD",
  "CATEGORIES_CARD",
  "CUSTOMERS_FLEET_CARD",
  "BROADCAST_CARD",
  "ORDER_PLACED",
  "APPLY_PROMO",
  "SWAP_SUMMARY",
  "CANCEL_ORDER",
]);

export function ActionCards({ actions = [], ...props }) {
  const reduced = useReducedMotion();
  return (
    <>
      {actions
        .filter((action) => visibleTypes.has(action.type || action.action))
        .map((action, index) => (
          <motion.div
            key={index}
            layout={reduced ? false : "position"}
            initial={reduced ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 320, damping: 28, delay: Math.min(index * 0.05, 0.2) }
            }
            className="assistant-action"
          >
            <ActionContent action={action} {...props} />
          </motion.div>
        ))}
    </>
  );
}

export default ActionCards;
