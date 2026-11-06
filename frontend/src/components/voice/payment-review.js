// All drawer entry points pass through this guard before contacting the agent.
export function requiresPaymentReview(prompt) {
  return /\b(pay|payment|payout|settle|settel|setal|satel|capture|restock|restok|replenish|supplier|checkout|check out|place.{0,15}order|complete.{0,15}order|order.{0,10}(now|cart)|buy.{0,15}(now|cart)|pack all|accept all)\b|చెల్లి|చెల్లిం|భుగతాన్|भुगतान|पैसे|பணம்/i.test(prompt);
}

export function validPaymentDetails(details) {
  return Number.isFinite(Number(details?.amount)) && Number(details?.amount) > 0 && Boolean(details?.recipient?.trim());
}