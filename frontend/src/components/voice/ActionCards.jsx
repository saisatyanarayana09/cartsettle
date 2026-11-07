import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { optimizeImage } from "../../utils/image";

const money = (value, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value) || 0);

function CompactProductCard({ item, currency = "USD", added, onAdd, disabled, cartItems, onUpdate }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [quantity, setQuantity] = useState(Math.max(1, Number(item.quantity || 1)));
  const photo = item.image || item.thumbnail || item.image_url;
  const price = Number(item.price ?? item.offer_price ?? item.regular_price ?? 0);
  const live = cartItems?.find(
    (row) => Number(row.product?.id ?? row.product ?? row.product_id ?? row.id) === Number(item.id),
  );
  const liveQuantity = Number(live?.quantity || 0);
  const selected = added && live ? liveQuantity : quantity;
  const change = (next) => {
    if (added && live && onUpdate) onUpdate(live, Math.max(0, next));
    else setQuantity(Math.max(1, next));
  };

  return (
    <div className="assistant-product">
      <div className="assistant-photo">
        {photo && !imageFailed ? (
          <img
            src={optimizeImage(photo, 160)}
            alt={item.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Package className="size-5" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-semibold break-words">{item.name}</p>
          {added && (
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              +1 Added
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.unit || item.pack_size || "1 unit"} · {money(price, currency)}
        </p>
        <div className="assistant-product-controls">
          <div className="assistant-stepper">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Decrease ${item.name} quantity`}
              disabled={disabled || (!live && selected <= 1)}
              onClick={() => change(selected - 1)}
            >
              <Minus />
            </Button>
            <output aria-label={`${item.name} quantity`}>{selected}</output>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Increase ${item.name} quantity`}
              disabled={disabled}
              onClick={() => change(selected + 1)}
            >
              <Plus />
            </Button>
          </div>
          {added && (!cartItems || live) ? (
            <span role="status" className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="size-3" /> In cart
            </span>
          ) : (
            <Button
              size="sm"
              disabled={disabled}
              aria-label={`Add ${quantity} ${item.name} to cart`}
              onClick={() => onAdd?.({ ...item, quantity })}
            >
              <Plus /> Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function RemovedMiniCard({ item, onUndo, busy }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photo = item.image || item.thumbnail || item.image_url;
  return (
    <div className="assistant-product opacity-75">
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
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => onUndo([item])} className="shrink-0 text-xs">
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
      <p className="break-words text-sm font-semibold">{item.name}</p>
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
            >
              <Minus />
            </Button>
            <output
              aria-label={`${item.name} reorder quantity`}
              className="min-w-5 text-center text-xs"
            >
              {quantity}
            </output>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Increase ${item.name} reorder quantity`}
              disabled={busy}
              onClick={() => setQuantity((value) => value + 1)}
            >
              <Plus />
            </Button>
          </div>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              onReviewPayment?.({
                prompt: `Restock ${quantity} units of ${item.name} via PayPal Payout`,
                amount: item.payout_amount,
                recipient: item.recipient || item.supplier_email,
              })
            }
          >
            Restock
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Auto-dismissing theme action card with 2.5s timer */
function AutoDismissThemeCard({ action, onToggleTheme, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  const isDark = action.theme !== "light";

  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissed(true);
      onDismiss?.(action);
    }, 2500);
    return () => clearTimeout(timer);
  }, [action, onDismiss]);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-background/95 p-3.5 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
          {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {isDark ? "Dark mode activated" : "Light mode activated"}
          </h3>
          <p role="status" className="text-xs text-muted-foreground">
            Auto-dismissing in 2.5s
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => {
            setDismissed(true);
            onToggleTheme?.(isDark ? "light" : "dark");
          }}
        >
          Undo
        </Button>
      </div>
      <div className="assistant-auto-dismiss-bar mt-2 rounded-full" />
    </div>
  );
}

/** In-Assistant Live Order Status & ETA Card */
function OrderStatusCard({ action, currency = "USD", onNavigate }) {
  const order = action.order || action;
  const stages = [
    { key: "NEW", label: "Placed" },
    { key: "ACCEPTED", label: "Accepted" },
    { key: "PREPARING", label: "Preparing" },
    { key: "OUT_FOR_DELIVERY", label: "On The Way" },
    { key: "DELIVERED", label: "Delivered" },
  ];

  const currentStatus = String(order.status || "ACCEPTED").toUpperCase();
  const currentStageIndex = stages.findIndex((s) => s.key === currentStatus);
  const activeIdx = currentStageIndex >= 0 ? currentStageIndex : 1;
  const etaText = order.delivery_eta || order.estimated_delivery || "Today by 6:45 PM";

  return (
    <div className="space-y-3.5 rounded-xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Order #{order.id || "202601"}</span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {currentStatus.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Truck className="size-3.5" />
            <span>Estimated Delivery: {etaText}</span>
          </p>
        </div>
        <span className="text-sm font-bold text-foreground">
          {money(order.total_amount ?? order.total ?? order.authorized_amount ?? 18.4, currency)}
        </span>
      </div>

      {/* Progress timeline */}
      <div className="flex items-center justify-between gap-1 pt-1">
        {stages.map((st, idx) => {
          const isDone = idx <= activeIdx;
          const isCurrent = idx === activeIdx;
          return (
            <div key={st.key} className="flex flex-col items-center flex-1 text-center">
              <div
                className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isCurrent
                    ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20"
                    : isDone
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? "✓" : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-[10px] leading-tight font-medium ${
                  isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                }`}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>

      {order.delivery_pin && (
        <div className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Delivery PIN:</span>
          <span className="font-mono font-bold tracking-widest text-foreground">{order.delivery_pin}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => onNavigate?.(`/profile/orders`)}
        >
          Track Order <ArrowUpRight className="ml-1 size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Grocery Photo Checklist Card */
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
    <div className="space-y-3 rounded-xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
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
                  {item.quantity ? `${item.quantity} × ` : ""}{item.name}
                </span>
              </label>

              {isInStock ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {money(prodPrice, currency)}
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
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
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm mt-1"
          disabled={busy}
          onClick={handleAddAllAvailable}
        >
          <Plus className="mr-1 size-3.5" />
          Add Available Items to Cart ({availableItems.length})
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
    <div className="space-y-3 rounded-xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <h3 className="text-sm font-bold text-foreground">Recent Notifications</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
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
            <p className="text-xs text-muted-foreground">{notif.message}</p>
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
    <div className="space-y-3 rounded-xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-foreground">Referral Rewards</h3>
          <p className="text-xs text-muted-foreground">Share CartSettle & earn $5 per friend</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-secondary/50 p-2.5">
          <p className="text-base font-extrabold text-foreground">{ref.friends_invited}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Friends Invited</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-2.5">
          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            ${ref.rewards_earned.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">Wallet Rewards</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/80 bg-background px-3 py-2 text-xs">
        <div className="font-mono font-bold tracking-wider text-foreground">{ref.code}</div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          onClick={copyCode}
        >
          {copied ? "Copied!" : "Copy Code"}
        </Button>
      </div>
    </div>
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
    return <OrderStatusCard action={action} currency={currency} onNavigate={onNavigate} />;
  }

  if (type === "GROCERY_CHECKLIST") {
    return <GroceryChecklistCard action={action} currency={currency} onAdd={onAdd} busy={busy} />;
  }

  if (type === "NOTIFICATIONS_CARD") {
    return <NotificationsCard action={action} />;
  }

  if (type === "REFERRAL_STATUS_CARD") {
    return <ReferralStatusCard action={action} />;
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

  if (type === "PAYMENT_REVIEW") return <p className="text-sm">{action.message}</p>;

  if (type === "UPDATE_CART_QTY") {
    const canUndo = onUndoQty && action.previous_quantity != null;
    return (
      <div className="flex items-center justify-between gap-2">
        <p role="status" className="flex gap-2 items-center text-sm">
          <Check className="size-4 text-emerald-500" />
          {action.name || "Item"} · {action.quantity} in cart
        </p>
        {canUndo && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onUndoQty(action)}>
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
      <p role="status" className="flex gap-2 items-center text-sm">
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
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onUndoRemove(removedList)}>
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
    return (
      <div className="space-y-2">
        {action.recipe && <h3 className="text-xs font-bold text-foreground">{action.recipe}</h3>}
        <div className="divide-y divide-border">
          {items.slice(0, 4).map((item, index) => (
            <CompactProductCard
              key={item.id || index}
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
        {type === "ADD_TO_CART" && onUndoAdd && items.length > 0 && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onUndoAdd(items)}>
            Undo
          </Button>
        )}
      </div>
    );
  }

  if (type === "MARGIN_DECISION") {
    const decision = action.decision || action;
    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <h3 className="font-bold">{decision.product || decision.item?.name || "Price offer"}</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-primary">
            {decision.counter_discount_pct ?? decision.discount_approved_pct ?? 0}% off ·{" "}
            {money(decision.counter_price ?? decision.final_price, currency)}
          </span>
        </div>
        {decision.item && persona === "shopper" && (
          <CompactProductCard
            item={{
              ...decision.item,
              price: decision.counter_price ?? decision.final_price ?? decision.item.price,
            }}
            currency={currency}
            onAdd={addProduct}
            added={addedItems?.[decision.item.id]}
            disabled={busy}
          />
        )}
      </div>
    );
  }

  if (type === "ORDER_CARD") {
    const order = action.order || action;
    const reorderItems = Array.isArray(order.items) ? order.items : [];
    return (
      <div className="space-y-3">
        <div className="flex justify-between gap-2 text-sm">
          <h3 className="font-semibold">Order #{order.id}</h3>
          <span className="text-muted-foreground">{order.status}</span>
        </div>
        <p className="text-sm">
          {money(
            order.total_amount ?? order.total ?? order.authorized_amount ?? order.authorized,
            currency,
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onNavigate(persona === "shopper" ? "/profile/orders" : `/owner/orders/${order.id}`)
            }
          >
            Open <ArrowUpRight />
          </Button>
          {persona === "shopper" && reorderItems.length > 0 && onReorder && (
            <Button size="sm" disabled={busy} onClick={() => onReorder(reorderItems)}>
              <Plus />
              Reorder
            </Button>
          )}
          {order.can_settle && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                onReviewPayment?.({
                  prompt: `Settle order ${order.id}`,
                  amount: order.total_amount ?? order.total ?? order.authorized_amount,
                  recipient: order.recipient || order.payee,
                  currency,
                })
              }
            >
              <Check />
              Settle
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (type === "LOW_STOCK_LIST")
    return (
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
    );

  if (type === "ORDER_SETTLED")
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Order #{action.order_id} settled</h3>
        <p className="text-sm">{money(action.captured, currency)}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate(`/owner/orders/${action.order_id}`)}
        >
          Receipt <ArrowUpRight />
        </Button>
      </div>
    );

  if (type === "PAYOUT_RECEIPT") {
    const receipt = action.receipt || action;
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Payout {receipt.status?.toLowerCase() || "sent"}</h3>
        <p className="text-sm">{money(receipt.amount_paid, currency)}</p>
        {receipt.product && (
          <p className="text-xs text-muted-foreground">
            {receipt.product} · {receipt.new_stock} in stock
          </p>
        )}
        {receipt.payout_batch_id && (
          <p className="break-all text-xs text-muted-foreground">{receipt.payout_batch_id}</p>
        )}
      </div>
    );
  }

  if (type === "PENDING_ORDERS")
    return (
      <div className="space-y-3">
        {(action.orders || []).map((order) => (
          <ActionContent
            key={order.id}
            {...{ currency, onSend, onNavigate, onReviewPayment, busy }}
            action={{ type: "ORDER_CARD", order: { ...order, can_settle: true } }}
          />
        ))}
      </div>
    );

  if (type === "CATALOG_SUMMARY")
    return (
      <div className="space-y-3">
        <p className="text-sm">
          {action.total} products · {action.in_stock} in stock
        </p>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/owner/products")}>
          Products <ArrowUpRight />
        </Button>
      </div>
    );

  if (type === "MARGIN_LIST")
    return (
      <div className="space-y-2">
        {(action.products || []).map((item, index) => (
          <div key={item.id || index} className="flex justify-between gap-2 text-sm">
            <span>{item.name}</span>
            <span>{item.margin_pct}%</span>
          </div>
        ))}
      </div>
    );

  if (type === "PRODUCT_UPDATED")
    return (
      <div className="space-y-2">
        <p className="text-sm">{action.product?.name} updated</p>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/owner/products")}>
          Products <ArrowUpRight />
        </Button>
      </div>
    );

  if (type === "BULK_SETTLED")
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <h3 className="font-semibold">{action.count || 0} orders settled</h3>
          <span className="font-semibold text-primary">
            {money(action.total_captured, currency)}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/owner/orders")}>
          Orders <ArrowUpRight />
        </Button>
      </div>
    );

  if (type === "ORDER_PLACED")
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <h3 className="font-semibold">Order #{action.order_id} placed</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">
            {action.payment_method || "COD"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Total: {money(action.total, currency)} · Delivery PIN: {action.delivery_pin || "—"}
        </p>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/profile/orders")}>
          Track Order <ArrowUpRight />
        </Button>
      </div>
    );

  if (type === "APPLY_PROMO")
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <div>
          <p className="font-semibold">Promo {action.code} applied</p>
          <p className="text-xs text-muted-foreground">
            {action.discount_pct || 10}% savings unlocked
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/cart")}>
          View Bag <ArrowUpRight />
        </Button>
      </div>
    );

  if (type === "SWAP_SUMMARY")
    return (
      <div className="space-y-1.5 text-sm">
        <p className="font-semibold">
          Swapped {action.removed?.name} → {action.added?.name}
        </p>
        <p className="text-xs font-medium text-primary">
          Saved {money(action.savings, currency)} instantly
        </p>
      </div>
    );

  if (type === "CANCEL_ORDER")
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">Order #{action.order_id} cancelled</span>
        <Button variant="outline" size="sm" onClick={() => onNavigate("/profile/orders")}>
          Orders <ArrowUpRight />
        </Button>
      </div>
    );

  return null;
}

const visibleTypes = new Set([
  "SWITCH_THEME",
  "TOGGLE_DARK_MODE",
  "ORDER_STATUS_CARD",
  "GROCERY_CHECKLIST",
  "NOTIFICATIONS_CARD",
  "REFERRAL_STATUS_CARD",
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
  "ORDER_SETTLED",
  "LOW_STOCK_LIST",
  "PAYOUT_RECEIPT",
  "PENDING_ORDERS",
  "CATALOG_SUMMARY",
  "MARGIN_LIST",
  "PRODUCT_UPDATED",
  "BULK_SETTLED",
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
            initial={reduced ? false : { y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 280, damping: 26, delay: index * 0.07 }
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
