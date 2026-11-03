import type { ReactElement } from "react";
export function ActionCards(props: {
  actions?: Record<string, unknown>[];
  currency?: string;
  persona?: string;
  onAdd?: (item: Record<string, unknown>) => void;
  onSend?: (prompt: string) => void;
  onNavigate?: (path: string) => void;
  busy?: boolean;
  addedItems?: Record<string, boolean>;
}): ReactElement;
