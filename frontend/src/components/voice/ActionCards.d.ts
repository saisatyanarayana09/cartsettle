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
  onUndoAdd?: (items: any[]) => void;
  onUndoRemove?: (items: any[]) => void;
  onUndoQty?: (action: any) => void;
  onReorder?: (items: any[]) => void;
  onDismiss?: (action: any) => void;
}): ReactElement;

export default ActionCards;
