import type { ReactElement } from "react";
export function PaymentReview(props: {
  review: { prompt: string; amount?: number; recipient?: string; currency?: string } | null;
  onConfirm?: () => void;
  onCancel: () => void;
  onOpen: () => void;
  busy?: boolean;
}): ReactElement | null;