import { useState } from "react";
import { Plus, Minus, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { optimizeImage } from "../../utils/image";

export function GroceryRow({ item, onAdd, added, currency = "INR" }) {
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [imageFailed, setImageFailed] = useState(false);
  const photo = item.image || item.thumbnail || item.image_url;
  const price = Number(item.price ?? item.offer_price ?? item.regular_price ?? 0);
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 py-3">
      <div className="flex size-12 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
        {photo && !imageFailed ? (
          <img
            src={optimizeImage(photo, 120)}
            alt={item.name}
            width={48}
            height={48}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Package className="size-5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-bold leading-snug">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.unit || item.pack_size || "1 unit"}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-extrabold">
            {currency === "USD" ? "$" : "₹"}
            {price.toFixed(2)}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex h-9 items-center rounded-md border border-border">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Decrease ${item.name} quantity`}
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                <Minus />
              </Button>
              <output
                aria-label={`${item.name} quantity`}
                className="min-w-5 text-center text-xs font-bold"
              >
                {quantity}
              </output>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Increase ${item.name} quantity`}
                onClick={() => setQuantity((value) => value + 1)}
              >
                <Plus />
              </Button>
            </div>
            <Button
              size="sm"
              className="h-9"
              aria-label={`Add ${quantity} ${item.name} to cart`}
              onClick={() => onAdd({ ...item, quantity })}
            >
              {added ? <Check /> : <Plus />}
              {added ? "Add again" : "Add"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
