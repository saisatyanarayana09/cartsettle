export const SHOPPER_HISTORY_KEY = "cartsettle_shopper_agent_chat_v2";

export function loadShopperHistory<T>(storage: Pick<Storage, "getItem">, greeting: T): T[] {
  try {
    const saved = storage.getItem(SHOPPER_HISTORY_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // A corrupt or unavailable browser cache must not prevent opening chat.
  }
  return [greeting];
}
