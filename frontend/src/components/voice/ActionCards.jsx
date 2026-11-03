import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroceryRow } from "../shopper/GroceryRow";

const money = (value, currency) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(value) || 0);

function RestockRow({ item, onSend, busy }) {
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
            onClick={() => onSend(`Restock ${quantity} units of ${item.name} via PayPal Payout`)}
          >
            Restock
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionContent({ action, currency, onAdd, addedItems, onSend, onNavigate, busy, persona }) {
  const type = action.type || action.action;
  const addProduct =
    onAdd || ((item) => onSend(`Add ${item.quantity || 1} units of ${item.name} to cart`));
  if (["SEARCH_RESULTS", "RECOMMEND_BASKET", "ADD_TO_CART"].includes(type)) {
    const items = type === "ADD_TO_CART" ? [action.item || action] : action.items || [];
    return (
      <>
        {action.recipe && <h3 className="text-sm font-semibold">{action.recipe}</h3>}
        <div className="divide-y divide-border">
          {items.map((item, index) => (
            <GroceryRow
              key={item.id || index}
              item={item}
              currency={currency}
              added={addedItems?.[item.id]}
              onAdd={addProduct}
              disabled={busy}
            />
          ))}
        </div>
      </>
    );
  }
  if (type === "MARGIN_DECISION") {
    const decision = action.decision || action;
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          {decision.product || decision.item?.name || "Price offer"}
        </h3>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span>{money(decision.counter_price ?? decision.final_price, currency)}</span>
          <span className="text-muted-foreground">
            {decision.counter_discount_pct ?? decision.discount_approved_pct ?? 0}% off
          </span>
        </div>
        {decision.item && persona === "shopper" && (
          <GroceryRow
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate(`/owner/orders/${order.id}`)}
          >
            Open <ArrowUpRight />
          </Button>
          {order.can_settle && (
            <Button size="sm" disabled={busy} onClick={() => onSend(`Settle order ${order.id}`)}>
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
          <RestockRow key={item.id || index} item={item} onSend={onSend} busy={busy} />
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
            {...{ currency, onSend, onNavigate, busy }}
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
  return null;
}

const visibleTypes = new Set([
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
            className="rounded-md border border-border bg-background p-3"
          >
            <ActionContent action={action} {...props} />
          </motion.div>
        ))}
    </>
  );
}
