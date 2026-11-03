import React, { useState } from "react";
import { Plus, Minus, Check, Package } from "lucide-react";
import { optimizeImage } from "../../utils/image";

export function GroceryRow({ item, onAdd, added, currency = "USD" }) {
  const [quantity, setQuantity] = useState(item.quantity || 1);
  const [imageFailed, setImageFailed] = useState(false);
  const photo = item.image || item.thumbnail || item.image_url;
  const price = Number(item.price ?? item.offer_price ?? item.regular_price ?? 0);
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 py-3">
      <div className="flex size-12 items-center justify-center overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
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
        <p className="break-words text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">{item.name}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {item.unit || item.pack_size || "1 unit"}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
            {currency === "USD" ? "$" : "₹"}
            {price.toFixed(2)}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <button
                type="button"
                aria-label={`Decrease ${item.name} quantity`}
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="flex size-8 items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Minus className="size-3.5" />
              </button>
              <output
                aria-label={`${item.name} quantity`}
                className="min-w-5 text-center text-xs font-bold text-slate-900 dark:text-slate-100"
              >
                {quantity}
              </output>
              <button
                type="button"
                aria-label={`Increase ${item.name} quantity`}
                onClick={() => setQuantity((value) => value + 1)}
                className="flex size-8 items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <button
              type="button"
              aria-label={`Add ${quantity} ${item.name} to cart`}
              onClick={() => onAdd({ ...item, quantity })}
              className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
              {added ? "Add again" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
