/**
 * Production Voice Transcript & Speech Recognition Normalizer
 * Cleans speech-to-text misspellings, phonetic slips (especially Indian English accents),
 * vernacular Kirana terms, and contextual cart ambiguities.
 */

const NUMBER_WORDS = [
  [/\btwenty[\s-]+five\b/gi, '25'],
  [/\btwenty[\s-]+four\b/gi, '24'],
  [/\btwenty[\s-]+three\b/gi, '23'],
  [/\btwenty[\s-]+two\b/gi, '22'],
  [/\btwenty[\s-]+one\b/gi, '21'],
  [/\btwenty\b/gi, '20'],
  [/\bnineteen\b/gi, '19'],
  [/\beighteen\b/gi, '18'],
  [/\bseventeen\b/gi, '17'],
  [/\bsixteen\b/gi, '16'],
  [/\bfifteen\b/gi, '15'],
  [/\bfourteen\b/gi, '14'],
  [/\bthirteen\b/gi, '13'],
  [/\btwelve\b/gi, '12'],
  [/\beleven\b/gi, '11'],
  [/\bten\b/gi, '10'],
  [/\bnine\b/gi, '9'],
  [/\beight\b/gi, '8'],
  [/\bseven\b/gi, '7'],
  [/\bsix\b/gi, '6'],
  [/\bfive\b/gi, '5'],
  [/\bfour\b/gi, '4'],
  [/\bthree\b/gi, '3'],
  [/\btwo\b/gi, '2'],
  [/\bone\b/gi, '1'],
  [/\bthirty\b/gi, '30'],
  [/\bforty\b/gi, '40'],
  [/\bfifty\b/gi, '50'],
  [/\bhundred\b/gi, '100'],
];

export function normalizeVoiceTranscript(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let out = rawText.trim();
  if (!out) return '';

  // 1. Spoken numbers to digits
  for (const [re, digit] of NUMBER_WORDS) {
    out = out.replace(re, digit);
  }

  // 2. Guard Payment Cards (credit card, debit card, gift card, etc.)
  // Replace protected terms with temporary tokens so they aren't turned into "cart"
  const PROTECTED_CARDS = [
    [/\b(credit|debit|gift|id|pan|aadhaar|aadhar|sim|atm|bank|loyalty|scratch)\s+card\b/gi, '##$1_CARD##'],
    [/\bcard\s+(number|pin|cvv|expiry|holder|details|statement)\b/gi, '##CARD_$1##'],
  ];
  for (const [re, token] of PROTECTED_CARDS) {
    out = out.replace(re, token);
  }

  // 3. CART Phonetic Normalization (handling common STT slips: card, part, car, court, cot, caught, kart, chart, etc.)
  // Direct slips
  out = out.replace(/\b(?:kart|caart|kaart|kaat|kurt)\b/gi, 'cart');

  // Preceded by prepositions/verbs/possessives: "to card", "into card", "in card", "my card", "the card", "view card", etc.
  out = out.replace(
    /\b(to|into|in|from|my|the|this|that|view|show|open|check|clear|empty|clean|reset|see)\s+card\b/gi,
    '$1 cart'
  );

  // Followed by cart properties: "card total", "card items", "card summary", "card contents", "card status"
  out = out.replace(/\bcard\s+(total|items?|summary|contents?|value|status|count)\b/gi, 'cart $1');

  // Standalone "card" or "my card"
  if (/^\s*(?:my\s+|the\s+)?card\s*$/i.test(out)) {
    out = out.replace(/\bcard\b/gi, 'cart');
  }

  // "add ... to card" or "put ... in card"
  out = out.replace(/\b(add\b.*?\bto)\s+card\b/gi, '$1 cart');
  out = out.replace(/\b(put\b.*?\b(?:in|into))\s+card\b/gi, '$1 cart');

  // "part" slips: "into the part", "to part", "in part", "my part", "part total", "add ... to part"
  out = out.replace(
    /\b(to|into|in|from|my|the|view|show|open|check|clear|empty)\s+(?:the\s+)?part\b/gi,
    '$1 cart'
  );
  out = out.replace(/\bpart\s+(total|items?|summary|contents?)\b/gi, 'cart $1');
  out = out.replace(/\b(add\b.*?\b(?:to|into|in))\s+(?:the\s+)?part\b/gi, '$1 cart');

  // "car" / "court" / "cot" / "caught" / "chart" slips
  out = out.replace(
    /\b(to|into|in|from|view|show|open|check|clear|empty)\s+(?:the\s+|my\s+)?(?:car|court|cot|caught|chart)\b/gi,
    '$1 cart'
  );
  out = out.replace(/\b(?:car|court|cot|caught|chart)\s+(total|items?|summary|contents?)\b/gi, 'cart $1');
  out = out.replace(/\b(add\b.*?\b(?:to|into|in))\s+(?:the\s+|my\s+)?(?:car|court|cot|caught|chart)\b/gi, '$1 cart');

  if (/^\s*(?:my\s+|the\s+)?(?:car|court|cot|kart)\s*$/i.test(out)) {
    out = out.replace(/\b(?:car|court|cot|kart)\b/gi, 'cart');
  }

  // Restore protected payment card tokens
  out = out.replace(/##([a-z0-9]+)_CARD##/gi, '$1 card');
  out = out.replace(/##CARD_([a-z0-9]+)##/gi, 'card $1');

  // 4. Command & Action Slips
  const ACTION_SLIPS = [
    [/\b(?:check[\s-]*out|cheqout|chekout|chikout|check\s+aut)\b/gi, 'checkout'],
    [/\b(?:setal|satel|settel|sattle)\b/gi, 'settle'],
    [/\b(?:kansal|cansel|cancle)\b/gi, 'cancel'],
    [/\b(?:auder|ordo|odder)\b/gi, 'order'],
    [/\b(?:re[\s-]*order|riorder)\b/gi, 'reorder'],
    [/\b(?:restok|re[\s-]+stock)\b/gi, 'restock'],
    [/\b(?:cheepar|chipper|cheper)\b/gi, 'cheaper'],
    [/\b(?:fayvorit|fevret|favourite|favourit)\b/gi, 'favorite'],
    [/\b(?:fayvorits|fevrets|favourites|favourits)\b/gi, 'favorites'],
    [/\b(?:remuv|remov|rimuv)\b/gi, 'remove'],
    [/\b(?:dilit|delet)\b/gi, 'delete'],
    [/\b(?:discont|discound|discout)\b/gi, 'discount'],
  ];
  for (const [re, replacement] of ACTION_SLIPS) {
    out = out.replace(re, replacement);
  }

  // 5. Product & Grocery Phonetic Slips
  const PRODUCT_SLIPS = [
    [/\b(?:straberry|strawbery|straberries|stoberry)\b/gi, 'strawberries'],
    [/\b(?:avacado|avacados|abocado|avocadoes)\b/gi, 'avocados'],
    [/\b(?:yoghurt|yogart|yougurt)\b/gi, 'yogurt'],
    [/\b(?:paasta)\b/gi, 'pasta'],
    [/\b(?:marinera)\b/gi, 'marinara'],
    [/\b(?:grosary|groceris|grossary|grosery)\b/gi, 'groceries'],
    [/\b(?:produs|prodice)\b/gi, 'produce'],
    [/\b(?:dary|dayry|deri)\b/gi, 'dairy'],
    [/\b(?:bekari|bekary)\b/gi, 'bakery'],
    [/\b(?:milkk|melk)\b/gi, 'milk'],
    [/\b(?:bred|braed)\b/gi, 'bread'],
  ];
  for (const [re, replacement] of PRODUCT_SLIPS) {
    out = out.replace(re, replacement);
  }

  // 6. Indian Kirana Vernacular / Hinglish Mapping
  const VERNACULAR_MAP = [
    [/\b(?:doodh|dudh|dhudh|dood)\b/gi, 'milk'],
    [/\b(?:ande|anday|anda)\b/gi, 'eggs'],
    [/\b(?:chawal|chaaval|chaval)\b/gi, 'rice'],
    [/\b(?:aata|ata)\b/gi, 'atta'],
    [/\b(?:cheeni|chini|shakkar)\b/gi, 'sugar'],
    [/\b(?:tamatar|tamator|tamater)\b/gi, 'tomato'],
    [/\b(?:pyaaz|pyaz|kanda|piyaz)\b/gi, 'onion'],
    [/\b(?:aalu|alu|batata)\b/gi, 'potato'],
    [/\b(?:panir|panner|paner)\b/gi, 'paneer'],
    [/\b(?:biriyani|briyani|birani)\b/gi, 'biryani'],
    [/\b(?:chaai|chay)\b/gi, 'chai'],
    [/\b(?:dahi)\b/gi, 'yogurt'],
    [/\b(?:sasta|kam\s+(?:price|dam))\b/gi, 'cheaper'],
    [/\b(?:hatao|nikalo)\b/gi, 'remove'],
    [/\b(?:khali\s+karo|saaf\s+karo)\b/gi, 'clear cart'],
    [/\b(?:total\s+kitna(?:\s+hua)?|kitna\s+hua|kitne\s+paise\s+hue|bill\s+kitna(?:\s+hua)?|kitna\s+bill)\b/gi, 'cart total'],
  ];
  for (const [re, replacement] of VERNACULAR_MAP) {
    out = out.replace(re, replacement);
  }

  // 7. Spoken Units & Currency
  out = out.replace(/(\d+(?:\.\d+)?)\s*(?:percent|per\s+cent)\b/gi, '$1%');
  out = out.replace(/\b(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?|usd)\b/gi, '$$$1');

  return out;
}
