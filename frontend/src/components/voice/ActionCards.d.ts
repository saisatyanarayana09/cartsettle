import type { ReactElement } from "react";
export function ActionCards(props: {
  actions?: Record<string, unknown>[];
  currency?: string;
  persona?: string;
  onAdd?: (item: Record<string, unknown>) => void;
  onToggleTheme?: (theme: string) => void;
  cartItems?: Record<string, any>[];
  onUpdate?: (item: Record<string, any>, quantity: number) => void;
  onReviewPayment?: (review: Record<string, any>) => void;
  onSend?: (prompt: string) => void;
  onNavigate?: (path: string) => void;
  busy?: boolean;
  addedItems?: Record<string, boolean>;
}): ReactElement;
