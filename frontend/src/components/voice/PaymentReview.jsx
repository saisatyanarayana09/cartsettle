import { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validPaymentDetails } from "./payment-review";

export function PaymentReview({ review, onConfirm, onCancel, onOpen, busy }) {
  const heading = useRef(null);
  useEffect(() => { if (review) heading.current?.focus(); }, [review]);
  if (!review) return null;
  const ready = validPaymentDetails(review) && typeof onConfirm === "function";
  return (
    <div className="assistant-payment" role="region" aria-labelledby="payment-review-title">
      <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="size-4" /><span className="text-xs">Payment review</span></div>
      <h3 ref={heading} tabIndex={-1} id="payment-review-title" className="mt-3 text-xl font-bold outline-none">{ready ? new Intl.NumberFormat("en-US", { style: "currency", currency: review.currency || "USD" }).format(Number(review.amount)) : "Review payment details"}</h3>
      <p className="mt-1 text-sm">{review.recipient || "Recipient not provided"}</p>
      <p className="mt-2 text-sm text-muted-foreground break-words">{review.prompt}</p>
      <p role="status" className="mt-3 text-xs text-muted-foreground">{ready ? "Tap to confirm. Voice cannot approve." : "Review verified details and approve on the payment screen. Nothing has been paid."}</p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        {ready ? <Button onClick={onConfirm} disabled={busy}>Confirm payment</Button> : <Button onClick={onOpen}>Open payment details</Button>}
      </div>
    </div>
  );
}