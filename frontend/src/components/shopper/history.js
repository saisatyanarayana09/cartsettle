export const SHOPPER_HISTORY_KEY = "cartsettle_shopper_agent_chat_v2";

export function loadShopperHistory(storage, initialMessage) {
  try {
    const saved = storage?.getItem(SHOPPER_HISTORY_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [initialMessage];
  } catch {
    return [initialMessage];
  }
}
