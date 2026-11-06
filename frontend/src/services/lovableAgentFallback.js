/**
 * Client-Side Data Contract Fallback for Cloud Previews (Lovable.dev / Static Hosting)
 * Only activates if the Django `/store/agent/chat/` endpoint is unreachable or returns 404.
 * Mirrors the exact backend response contract (`reply`, `voice_reply`, `mode`, `actions`, `tools_used`, `follow_ups`).
 */

const SESSION_STORE = {};

const DEMO_PRODUCTS = [
  { id: 101, name: 'Organic Farm Whole Milk', unit: '1 Gal', price: 4.50, regular_price: 4.50, offer_price: 4.50, cost_price: 3.60, stock: 8, stock_quantity: 8, category: 'Dairy & Eggs', category_name: 'Dairy & Eggs', margin_pct: 20.0, max_safe_discount_pct: 9.0, best_deal_price: 4.10, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=240&q=80', aliases: ['milk', 'dairy'] },
  { id: 102, name: 'Artisanal Sourdough Bread', unit: '1 Loaf', price: 5.50, regular_price: 5.50, offer_price: 5.50, cost_price: 4.00, stock: 14, stock_quantity: 14, category: 'Bakery', category_name: 'Bakery', margin_pct: 27.3, max_safe_discount_pct: 17.3, best_deal_price: 4.55, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=240&q=80', aliases: ['bread', 'sourdough', 'loaf', 'toast'] },
  { id: 103, name: 'Fresh California Strawberries', unit: '1 lb', price: 4.99, regular_price: 4.99, offer_price: 4.99, cost_price: 4.10, stock: 40, stock_quantity: 40, category: 'Produce', category_name: 'Produce', margin_pct: 17.8, max_safe_discount_pct: 6.6, best_deal_price: 4.66, image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=240&q=80', aliases: ['strawberry', 'strawberries', 'berries', 'berry'] },
  { id: 104, name: 'Pasture-Raised Organic Eggs', unit: '12 ct', price: 5.99, regular_price: 5.99, offer_price: 5.99, cost_price: 4.70, stock: 6, stock_quantity: 6, category: 'Dairy & Eggs', category_name: 'Dairy & Eggs', margin_pct: 21.5, max_safe_discount_pct: 10.8, best_deal_price: 5.35, image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=240&q=80', aliases: ['egg', 'eggs', 'dozen'] },
  { id: 105, name: 'Organic Hass Avocados', unit: 'Bag of 4', price: 6.50, regular_price: 6.50, offer_price: 6.50, cost_price: 5.10, stock: 5, stock_quantity: 5, category: 'Produce', category_name: 'Produce', margin_pct: 21.5, max_safe_discount_pct: 10.8, best_deal_price: 5.80, image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=240&q=80', aliases: ['avocado', 'avocados', 'guacamole'] },
  { id: 106, name: 'Bronze-Cut Penne Pasta', unit: '16 oz', price: 3.50, regular_price: 3.50, offer_price: 3.50, cost_price: 2.50, stock: 25, stock_quantity: 25, category: 'Pantry', category_name: 'Pantry', margin_pct: 28.6, max_safe_discount_pct: 18.9, best_deal_price: 2.84, image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=240&q=80', aliases: ['pasta', 'penne', 'spaghetti'] },
  { id: 107, name: 'San Marzano Marinara Sauce', unit: '24 oz', price: 6.50, regular_price: 6.50, offer_price: 6.50, cost_price: 4.80, stock: 18, stock_quantity: 18, category: 'Pantry', category_name: 'Pantry', margin_pct: 26.2, max_safe_discount_pct: 16.0, best_deal_price: 5.45, image: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=240&q=80', aliases: ['marinara', 'sauce', 'tomato'] },
  { id: 108, name: 'Aged Parmigiano Reggiano', unit: '8 oz', price: 5.50, regular_price: 5.50, offer_price: 5.50, cost_price: 4.20, stock: 12, stock_quantity: 12, category: 'Dairy & Eggs', category_name: 'Dairy & Eggs', margin_pct: 23.6, max_safe_discount_pct: 13.1, best_deal_price: 4.78, image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=240&q=80', aliases: ['cheese', 'parmesan', 'parmigiano', 'reggiano'] },
  { id: 109, name: 'Greek Honey Yogurt', unit: '32 oz', price: 4.99, regular_price: 4.99, offer_price: 4.99, cost_price: 3.80, stock: 9, stock_quantity: 9, category: 'Dairy & Eggs', category_name: 'Dairy & Eggs', margin_pct: 23.8, max_safe_discount_pct: 13.4, best_deal_price: 4.32, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=240&q=80', aliases: ['yogurt', 'curd'] },
  { id: 110, name: 'Whole Wheat Chakki Atta', unit: '10 lb', price: 12.99, regular_price: 12.99, offer_price: 12.99, cost_price: 10.20, stock: 15, stock_quantity: 15, category: 'Pantry', category_name: 'Pantry', margin_pct: 21.5, max_safe_discount_pct: 10.8, best_deal_price: 11.59, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=240&q=80', aliases: ['atta', 'flour', 'wheat', 'roti'] },
];

const DEMO_ORDERS = [
  { id: 'ORD202600005', status: 'READY', customer: 'Alex Rivera', total_amount: 46.80, authorized_amount: 54.00, captured_amount: 46.80, released_amount: 7.20, items_count: 4 },
  { id: 'ORD202600004', status: 'PREPARING', customer: 'Priya Sharma', total_amount: 32.50, authorized_amount: 37.38, captured_amount: 0, released_amount: 0, items_count: 3, can_settle: true },
  { id: 'ORD202600003', status: 'ACCEPTED', customer: 'Marcus Vance', total_amount: 28.90, authorized_amount: 33.24, captured_amount: 0, released_amount: 0, items_count: 3, can_settle: true },
  { id: 'ORD202600002', status: 'NEW', customer: 'Elena Rostova', total_amount: 50.00, authorized_amount: 57.50, captured_amount: 0, released_amount: 0, items_count: 5, can_settle: true },
];

const STOP_WORDS = new Set([
  'update', 'change', 'set', 'price', 'stock', 'add', 'buy', 'get', 'put',
  'cart', 'bag', 'basket', 'order', 'find', 'search', 'check', 'best', 'deal',
  'deals', 'for', 'the', 'and', 'with', 'from', 'remove', 'delete', 'create',
  'product', 'products', 'item', 'items', 'units', 'unit', 'off', 'discount',
  'margin', 'margins', 'restock', 'payout', 'via', 'paypal', 'please', 'can',
  'you', 'want', 'need', 'show', 'me', 'how', 'much', 'many', 'what', 'which',
  'who', 'where', 'when', 'is', 'are', 'was', 'were', 'in', 'of', 'to', 'my',
  'our', 'store', 'shop', 'have', 'has', 'do', 'does', 'cost', 'costs',
  'available', 'left', 'about', 'tell', 'give', 'some', 'any', 'all', 'more',
  'most', 'least', 'cheapest', 'expensive', 'highest', 'lowest', 'total',
  'under', 'over', 'above', 'below', 'dollar', 'dollars', 'percent',
  'it', 'that', 'them', 'those', 'this', 'these', 'there', 'here',
]);

const MODIFIER_WORDS = new Set([
  'organic', 'fresh', 'farm', 'whole', 'california', 'imported', 'creamy',
  'aged', 'pasture', 'raised', 'artisanal', 'bronze', 'cut', 'san', 'marzano',
  'hass', 'greek', 'wheat', 'chakki', 'pack', 'lb', 'oz', 'gal', 'ct',
  'bottle', 'jar', 'box', 'loaf',
]);

function getLiveCatalog() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sk_cache_/products/')) {
          const parsed = JSON.parse(localStorage.getItem(k));
          const list = Array.isArray(parsed?.data?.results)
            ? parsed.data.results
            : Array.isArray(parsed?.data)
            ? parsed.data
            : null;
          if (list && list.length > 0) {
            return list.map((p) => {
              const sell = Number(p.offer_price || p.price || p.regular_price || 4.99);
              const reg = Number(p.regular_price || sell);
              const cost = Number(p.cost_price || (sell * 0.78).toFixed(2));
              const marginPct = sell > 0 ? Number((((sell - cost) / sell) * 100).toFixed(1)) : 20.0;
              const minSafe = Number((cost / 0.88).toFixed(2));
              const maxDisc = sell > 0 ? Math.max(0, Number((((sell - minSafe) / sell) * 100).toFixed(1))) : 10.0;
              const stockQty = Number(p.stock_quantity ?? p.stock ?? 20);
              return {
                id: p.id,
                name: p.name,
                unit: p.unit || '1 unit',
                price: sell,
                regular_price: reg,
                offer_price: sell,
                cost_price: cost,
                stock: stockQty,
                stock_quantity: stockQty,
                category: p.category_name || p.category?.name || (typeof p.category === 'string' ? p.category : 'Groceries'),
                category_name: p.category_name || p.category?.name || 'Groceries',
                margin_pct: marginPct,
                max_safe_discount_pct: maxDisc,
                best_deal_price: minSafe < sell ? minSafe : sell,
                image: p.image || p.primary_image || p.thumbnail || null,
                thumbnail: p.thumbnail || p.image || p.primary_image || null,
                aliases: [],
              };
            });
          }
        }
      }
    } catch {
      // ignore localStorage read errors
    }
  }
  return DEMO_PRODUCTS;
}

function stemWord(w) {
  if (w.endsWith('ies') && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith('oes') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

function matchProductsFromText(text, limit = 6) {
  if (!text) return [];
  const lower = String(text).toLowerCase();
  const qTokens = (lower.match(/[a-z]+/g) || []).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  if (qTokens.length === 0) return [];

  const catalog = getLiveCatalog();
  const scored = [];
  for (const p of catalog) {
    const pLower = p.name.toLowerCase();
    const pTokens = (pLower.match(/[a-z]+/g) || []).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
    const allWords = [...pTokens, ...(p.aliases || [])];
    let score = 0;
    let coreMatched = false;

    if (lower.includes(pLower)) {
      score += 50;
      coreMatched = true;
    }

    for (const qt of qTokens) {
      const qtStem = stemWord(qt);
      let bestTok = 0;
      let tokCore = false;
      for (const pw of allWords) {
        const pwStem = stemWord(pw);
        if (qt === pw || qtStem === pwStem) {
          if (MODIFIER_WORDS.has(pw) && MODIFIER_WORDS.has(qt)) {
            if (bestTok < 3) bestTok = 3;
          } else if (bestTok < 20) {
            bestTok = 20;
            tokCore = true;
          }
        }
      }
      score += bestTok;
      if (tokCore) coreMatched = true;
    }

    if (score > 0) {
      scored.push({ score, coreMatched, prod: p });
    }
  }

  if (scored.length === 0) return [];
  const hasCore = scored.some((s) => s.coreMatched);
  const filtered = hasCore
    ? scored.filter((s) => s.coreMatched)
    : scored.filter((s) => s.score >= 3);

  filtered.sort((a, b) => b.score - a.score || a.prod.id - b.prod.id);
  return filtered.slice(0, limit).map((s) => s.prod);
}

function matchSingleProduct(text) {
  const matches = matchProductsFromText(text, 1);
  return matches[0] || null;
}

function extractItemsWithQuantities(text) {
  if (!text) return [];
  const clauses = String(text)
    .split(/\s*(?:\band\b|,|\bplus\b|\bwith\b|&|\balso\b)\s*/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const extractQty = (segment) => {
    const cleaned = segment.replace(/\$\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:%|lb|lbs|oz|ct|gal|kg|g|pack)\b|\b(?:bag\s+of\s+\d+|ord\d+\w*)\b/gi, '');
    const m = cleaned.match(/\b(\d+)\b/);
    return m ? Math.max(1, Math.min(Number(m[1]), 99)) : 1;
  };

  const map = new Map();
  for (const clause of clauses) {
    const prod = matchSingleProduct(clause);
    if (prod) {
      const qty = extractQty(clause);
      if (map.has(prod.id)) {
        map.get(prod.id).qty += qty;
      } else {
        map.set(prod.id, { prod, qty });
      }
    }
  }

  if (map.size === 0) {
    const single = matchSingleProduct(text);
    if (single) return [{ prod: single, qty: extractQty(text) }];
    return [];
  }
  return Array.from(map.values());
}

function normalizeVoiceTranscript(text) {
  if (!text) return '';
  let out = String(text).trim();
  const wordToNum = [
    [/\btwenty[\s-]+five\b/gi, '25'],
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
  for (const [re, digit] of wordToNum) {
    out = out.replace(re, digit);
  }

  const englishPhoneticMap = [
    [/\b(?:straberry|strawbery|straberries)\b/gi, 'strawberries'],
    [/\b(?:avacado|avacados)\b/gi, 'avocados'],
    [/\b(?:yoghurt|yogart)\b/gi, 'yogurt'],
    [/\b(?:cheepar|chipper)\b/gi, 'cheaper'],
    [/\b(?:auder|ordo|odder)\b/gi, 'order'],
    [/\b(?:setal|satel|settel)\b/gi, 'settle'],
    [/\b(?:kansal|cansel)\b/gi, 'cancel'],
    [/\b(?:fayvorit|fevret|favourite)\b/gi, 'favorite'],
    [/\b(?:fayvorits|fevrets|favourites)\b/gi, 'favorites'],
    [/\b(?:restok|re[\s-]+stock)\b/gi, 'restock'],
  ];
  for (const [re, replacement] of englishPhoneticMap) {
    out = out.replace(re, replacement);
  }

  out = out.replace(/(\d+(?:\.\d+)?)\s*(?:percent|per\s+cent)\b/gi, '$1%');
  out = out.replace(/\b(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?|usd)\b/gi, '$$$1');
  return out;
}

function serializeCardItem(prod, quantity = 1, customPrice = null) {
  const finalPrice = customPrice !== null ? Number(customPrice) : prod.price;
  return {
    id: prod.id,
    name: prod.name,
    price: finalPrice,
    regular_price: prod.regular_price || prod.price,
    offer_price: finalPrice,
    best_deal_price: prod.best_deal_price || finalPrice,
    max_safe_discount_pct: prod.max_safe_discount_pct || 10,
    unit: prod.unit || '1 unit',
    quantity,
    stock: prod.stock_quantity,
    stock_quantity: prod.stock_quantity,
    category: prod.category || prod.category_name || 'Groceries',
    image: prod.image || null,
    thumbnail: prod.thumbnail || prod.image || null,
  };
}

export function handleLovableAgentFallback(config) {
  const method = (config.method || 'get').toLowerCase();
  let body = {};
  try {
    body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
  } catch {
    body = {};
  }

  const params = config.params || {};
  const sessionId = body.session_id || params.session_id || 'default_session';
  const persona = String(body.persona || body.role || params.persona || params.role || 'owner').toLowerCase();
  const mode = String(body.mode || params.mode || 'chat').toLowerCase();
  const key = `${persona}:${sessionId}`;

  if (!SESSION_STORE[key]) {
    SESSION_STORE[key] = { session_id: sessionId, persona, messages: [], last_order_id: 'ORD202600005', last_product: null };
  }

  if (method === 'delete') {
    SESSION_STORE[key] = { session_id: sessionId, persona, messages: [], last_order_id: null, last_product: null };
    return { status: 'cleared', messages: [] };
  }

  if (method === 'get') {
    return SESSION_STORE[key];
  }

  const rawPrompt = String(body.prompt || body.message || '').trim();
  let prompt = normalizeVoiceTranscript(rawPrompt);
  const mem = SESSION_STORE[key];

  // Contextual Pronoun Resolution ('it', 'that', 'them', 'those')
  const lowerRaw = prompt.toLowerCase();
  if (mem.last_order_id && ['that order', 'this order', 'settle it', 'audit it', 'capture it'].some((w) => lowerRaw.includes(w))) {
    if (!/\bord\d+\w*\b/i.test(lowerRaw)) {
      prompt = `${prompt} (${mem.last_order_id})`;
    }
  } else if (mem.last_product && !matchSingleProduct(prompt)) {
    if (/\b(it|that|them|those|this item|that item|more)\b/i.test(lowerRaw) || ['% off', 'discount', 'in stock', 'how much'].some((w) => lowerRaw.includes(w))) {
      prompt = `${prompt} (${mem.last_product})`;
    }
  }

  const lower = prompt.toLowerCase();

  let reply = 'How can I help?';
  let actions = [];
  let tools_used = [{ name: 'live_store_memory', args: {} }];
  let follow_ups = persona === 'owner'
    ? ['Check pending orders', 'Check low stock', 'Which product has the highest margin?']
    : ['What is the cheapest item?', 'Add 1 Whole Milk', '15% off Strawberries'];

  // 0A. Live Theme Switch ("switch to dark mode", "switch to light mode")
  if (
    ['dark mode', 'light mode', 'dark theme', 'light theme', 'switch theme', 'toggle theme', 'night mode', 'day mode'].some((k) =>
      lower.includes(k)
    )
  ) {
    const targetTheme = lower.includes('light') || lower.includes('day') ? 'light' : 'dark';
    const label = targetTheme === 'light' ? 'Light Mode' : 'Dark Mode';
    reply = `${label} activated.`;
    actions = [{ type: 'SWITCH_THEME', theme: targetTheme }];
    tools_used = [{ name: 'switch_theme', args: { theme: targetTheme } }];
  }
  // 0. Strict Settings Guardrail
  else if (
    lower.includes('setting') ||
    lower.includes('operating hour') ||
    lower.includes('delivery radius') ||
    lower.includes('change store name') ||
    lower.includes('change password')
  ) {
    reply = 'Settings can only be changed manually.';
    actions = [];
    tools_used = [{ name: 'settings_guardrail', args: { blocked: true } }];
  }
  // 1. Navigation commands (All shop pages EXCEPT settings)
  else if (/^(open|go to|navigate to|visit)\s+/.test(lower) || lower.includes('go to checkout') || lower === 'checkout') {
    const ordMatch = lower.match(/\b(ord\d+\w*)\b/i);
    if (ordMatch) {
      const oid = ordMatch[1].toUpperCase();
      reply = `Opening Order #${oid}.`;
      actions = [{ type: 'NAVIGATE', path: `/owner/orders/${oid}`, label: `Order #${oid}` }];
    } else if (lower.includes('order')) {
      const path = persona === 'owner' ? '/owner/orders' : '/profile/orders';
      reply = 'Opening Orders.';
      actions = [{ type: 'NAVIGATE', path, label: 'Orders' }];
    } else if (lower.includes('product') || lower.includes('catalog') || lower.includes('inventory')) {
      const path = persona === 'owner' ? '/owner/products' : '/products';
      reply = 'Opening Products.';
      actions = [{ type: 'NAVIGATE', path, label: 'Products' }];
    } else if (lower.includes('categor')) {
      const path = persona === 'owner' ? '/owner/categories' : '/categories';
      reply = 'Opening Categories.';
      actions = [{ type: 'NAVIGATE', path, label: 'Categories' }];
    } else if (lower.includes('offer') || lower.includes('promo') || lower.includes('coupon')) {
      const path = persona === 'owner' ? '/owner/offers' : '/profile/offers';
      reply = 'Opening Offers.';
      actions = [{ type: 'NAVIGATE', path, label: 'Offers' }];
    } else if (lower.includes('sale') || lower.includes('revenue')) {
      reply = 'Opening Sales.';
      actions = [{ type: 'NAVIGATE', path: '/owner/sales', label: 'Sales' }];
    } else if (lower.includes('customer')) {
      reply = 'Opening Customers.';
      actions = [{ type: 'NAVIGATE', path: '/owner/customers', label: 'Customers' }];
    } else if (lower.includes('invoice')) {
      reply = 'Opening Invoices.';
      actions = [{ type: 'NAVIGATE', path: '/owner/invoices', label: 'Invoices' }];
    } else if (lower.includes('delivery')) {
      reply = 'Opening Delivery.';
      actions = [{ type: 'NAVIGATE', path: '/owner/delivery-partners', label: 'Delivery' }];
    } else if (lower.includes('dashboard') || lower.includes('analytics')) {
      reply = 'Opening Dashboard.';
      actions = [{ type: 'NAVIGATE', path: '/owner', label: 'Dashboard' }];
    } else if (lower.includes('checkout')) {
      reply = 'Opening Checkout.';
      actions = [{ type: 'NAVIGATE', path: '/checkout', label: 'Checkout' }];
    } else if (lower.includes('cart')) {
      reply = 'Opening Cart.';
      actions = [{ type: 'NAVIGATE', path: '/cart', label: 'Cart' }];
    }
    tools_used = [{ name: 'navigate_portal', args: {} }];
  }
  // 1b. Superlative & Analytical Queries (Cheapest, Most Expensive, Highest/Lowest Margin, Stock)
  else if (
    ['cheapest', 'lowest price', 'least expensive', 'most affordable', 'most expensive', 'highest price', 'priciest', 'highest margin', 'best margin', 'most profitable', 'lowest margin', 'most stock', 'highest stock', 'least stock', 'lowest stock'].some((k) => lower.includes(k))
  ) {
    if (['cheapest', 'lowest price', 'least expensive', 'most affordable'].some((k) => lower.includes(k))) {
      const sorted = [...DEMO_PRODUCTS].sort((a, b) => a.price - b.price);
      const top = sorted[0];
      const cards = sorted.slice(0, 4).map((p) => serializeCardItem(p, 1));
      reply = `Cheapest item is ${top.name} at $${top.price.toFixed(2)} per ${top.unit} with ${top.stock_quantity} in stock.`;
      actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    } else if (['most expensive', 'highest price', 'priciest'].some((k) => lower.includes(k))) {
      const sorted = [...DEMO_PRODUCTS].sort((a, b) => b.price - a.price);
      const top = sorted[0];
      const cards = sorted.slice(0, 4).map((p) => serializeCardItem(p, 1));
      reply = `Most expensive item is ${top.name} at $${top.price.toFixed(2)} per ${top.unit} with ${top.stock_quantity} in stock.`;
      actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    } else if (['highest margin', 'best margin', 'most profitable', 'lowest margin'].some((k) => lower.includes(k))) {
      const isLow = lower.includes('lowest margin');
      const sorted = [...DEMO_PRODUCTS].sort((a, b) => (isLow ? a.margin_pct - b.margin_pct : b.margin_pct - a.margin_pct));
      const top = sorted[0];
      reply = `${isLow ? 'Lowest' : 'Highest'} margin is ${top.name} at ${top.margin_pct.toFixed(1)}% margin, selling at $${top.price.toFixed(2)} with $${top.cost_price.toFixed(2)} cost.`;
      actions = [{ type: 'MARGIN_LIST', products: sorted.slice(0, 4).map((p) => ({ ...p, selling_price: p.price })) }];
    } else {
      const isLow = lower.includes('least stock') || lower.includes('lowest stock');
      const sorted = [...DEMO_PRODUCTS].sort((a, b) => (isLow ? a.stock_quantity - b.stock_quantity : b.stock_quantity - a.stock_quantity));
      const top = sorted[0];
      const cards = sorted.slice(0, 4).map((p) => serializeCardItem(p, 1));
      reply = `${isLow ? 'Lowest' : 'Highest'} stock is ${top.name} with ${top.stock_quantity} units at $${top.price.toFixed(2)}.`;
      actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    }
    tools_used = [{ name: 'search_products_and_stock', args: { query: prompt } }];
  }
  // 1c. Create / Delete Product
  else if (/(create|add|new|delete|remove)\s+product/.test(lower)) {
    if (lower.includes('delete') || lower.includes('remove')) {
      reply = 'Product removed.';
      actions = [{ type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'create_or_delete_product', args: { action: 'delete' } }];
    } else {
      const priceMatch = lower.match(/\$?(\d+(?:\.\d+)?)/);
      const price = priceMatch ? Number(priceMatch[1]) : 4.99;
      const newProd = { id: Date.now(), name: 'Organic Honey', unit: '12 oz', price, regular_price: price, offer_price: price, cost_price: Number((price * 0.78).toFixed(2)), stock: 25, stock_quantity: 25, category: 'Pantry', category_name: 'Pantry', margin_pct: 22.0, max_safe_discount_pct: 10.0, best_deal_price: Number((price * 0.9).toFixed(2)), aliases: ['honey'] };
      DEMO_PRODUCTS.unshift(newProd);
      reply = `Added ${newProd.name} at $${price.toFixed(2)}.`;
      actions = [{ type: 'PRODUCT_UPDATED', product: newProd }, { type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'create_or_delete_product', args: { action: 'create', price } }];
    }
  }
  // 1d. Categories, Promo Codes, Sales, Customers, Broadcast
  else if (lower.includes('categor')) {
    reply = '4 categories: Dairy & Eggs, Produce, Pantry, Bakery.';
    tools_used = [{ name: 'manage_category', args: { action: 'list' } }];
  } else if (
    (lower.includes('promo') || lower.includes('coupon')) &&
    !(persona === 'shopper' && ['apply ', 'use ', 'best '].some((w) => lower.includes(w)))
  ) {
    if (lower.includes('create') || lower.includes('add')) {
      reply = 'Created promo code SAVE10.';
      actions = [{ type: 'REFRESH_DATA' }];
    } else {
      reply = 'Active promos: SAVE10, FRESH15.';
    }
    tools_used = [{ name: 'manage_promo_code', args: {} }];
  } else if (lower.includes('sales') || lower.includes('revenue') || lower.includes('aov')) {
    reply = 'Total revenue is $1,842.50 across 52 orders.';
    tools_used = [{ name: 'get_sales_and_analytics', args: {} }];
  } else if (lower.includes('broadcast') || lower.includes('notify customer')) {
    reply = 'Broadcast sent to customers.';
    actions = [{ type: 'REFRESH_DATA' }];
    tools_used = [{ name: 'send_customer_broadcast', args: {} }];
  }
  // 2. Recent order / Order ID
  else if (
    (lower.includes('recent order') || lower.includes('latest order') || lower.includes('last order') || lower.includes('order number')) &&
    !['reorder', 'repeat', 'cancel', 'place'].some((w) => lower.includes(w))
  ) {
    const top = DEMO_ORDERS[0];
    mem.last_order_id = top.id;
    reply = `Order #${top.id} is ${top.status} for $${top.total_amount.toFixed(2)}.`;
    actions = [{ type: 'ORDER_CARD', order: top }];
    tools_used = [{ name: 'get_latest_order', args: {} }];
    follow_ups = [`Settle order ${top.id}`, 'Check pending orders', 'Check low stock'];
  }
  // 3. Pending orders
  else if (
    lower.includes('pending') &&
    lower.includes('order') &&
    !['settle', 'capture', 'pack all', 'accept all'].some((w) => lower.includes(w)) &&
    !(persona === 'shopper' && lower.includes('show'))
  ) {
    const pending = DEMO_ORDERS.filter((o) => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status));
    reply = pending.length
      ? `${pending.length} orders pending packing, starting with #${pending[0].id} for ${pending[0].customer} at $${pending[0].total_amount.toFixed(2)}.`
      : 'No pending orders.';
    actions = [{ type: 'PENDING_ORDERS', orders: pending }];
    tools_used = [{ name: 'get_pending_packing_orders', args: {} }];
  }
  // 4. Settle order (Single or Bulk All Pending)
  else if (lower.includes('settle') || lower.includes('capture') || lower.includes('pack all') || lower.includes('accept all pending')) {
    if ((lower.includes('all') || lower.includes('pending orders')) && persona === 'owner') {
      const pending = DEMO_ORDERS.filter((o) => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status));
      let totalCap = 0;
      const settledIds = [];
      for (const po of pending) {
        po.status = 'READY';
        po.captured_amount = Number((po.total_amount * 0.92).toFixed(2));
        po.released_amount = Number((po.authorized_amount - po.captured_amount).toFixed(2));
        totalCap += po.captured_amount;
        settledIds.push(po.id);
      }
      reply = settledIds.length
        ? `Settled ${settledIds.length} pending orders ($${totalCap.toFixed(2)} total PayPal captured).`
        : 'All orders are already settled.';
      actions = [
        { type: 'BULK_SETTLED', count: settledIds.length, total_captured: Number(totalCap.toFixed(2)), orders: settledIds },
        { type: 'REFRESH_DATA' },
      ];
      tools_used = [{ name: 'auto_settle_order_packing', args: { batch_count: settledIds.length } }];
    } else {
      const ordMatch = lower.match(/\b(ord\d+\w*)\b/i);
      const targetId = ordMatch ? ordMatch[1].toUpperCase() : (mem.last_order_id || 'ORD202600002');
      const found = DEMO_ORDERS.find((o) => o.id === targetId) || DEMO_ORDERS[3];
      found.status = 'READY';
      found.captured_amount = Number((found.total_amount * 0.92).toFixed(2));
      found.released_amount = Number((found.authorized_amount - found.captured_amount).toFixed(2));
      reply = `Order #${found.id} settled for $${found.captured_amount.toFixed(2)}.`;
      actions = [
        { type: 'ORDER_SETTLED', order_id: found.id, captured: found.captured_amount, released: found.released_amount },
        { type: 'REFRESH_DATA' },
      ];
      tools_used = [{ name: 'auto_settle_order_packing', args: { order_id: found.id } }];
    }
  }
  // 5. Accept / Prepare / Dispatch / Deliver / Cancel order
  else if (
    ['accept', 'prepare', 'dispatch', 'deliver', 'reject', 'cancel'].some((w) => lower.includes(w)) &&
    (lower.includes('order') || /ord\d+/i.test(lower)) &&
    !(persona === 'shopper' && !lower.includes('cancel'))
  ) {
    const ordMatch = lower.match(/\b(ord\d+\w*)\b/i);
    const targetId = ordMatch ? ordMatch[1].toUpperCase() : (mem.last_order_id || 'ORD202600002');
    const found = DEMO_ORDERS.find((o) => o.id === targetId) || DEMO_ORDERS[3];
    if (persona === 'shopper' && lower.includes('cancel')) {
      found.status = 'CANCELLED';
      reply = `Cancelled Order #${found.id}.`;
      actions = [{ type: 'CANCEL_ORDER', order_id: found.id }, { type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'cancel_shopper_order', args: { order_id: found.id } }];
    } else {
      if (lower.includes('accept')) found.status = 'ACCEPTED';
      else if (lower.includes('prepare')) found.status = 'PREPARING';
      else if (lower.includes('dispatch')) found.status = 'OUT_FOR_DELIVERY';
      else if (lower.includes('deliver')) found.status = 'DELIVERED';
      else found.status = 'REJECTED';
      reply = `Order #${found.id} marked ${found.status}.`;
      actions = [{ type: 'ORDER_CARD', order: found }, { type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'update_order_status', args: { order_id: found.id, new_status: found.status } }];
    }
  }
  // 6. Update product stock or price (or Shopper Cart Quantity Update)
  else if ((lower.includes('update') || lower.includes('set') || lower.includes('change')) && (lower.includes('stock') || lower.includes('price') || lower.includes('quantity') || lower.includes('qty') || lower.includes('cart') || lower.includes('bag'))) {
    const prod = matchSingleProduct(prompt) || getLiveCatalog()[0];
    const numMatch = lower.match(/(\d+(?:\.\d+)?)/g);
    const val = numMatch ? Number(numMatch[numMatch.length - 1]) : 40;
    if (persona === 'shopper' && (lower.includes('quantity') || lower.includes('qty') || lower.includes('cart') || lower.includes('bag'))) {
      const targetQty = Math.max(0, Math.round(val));
      const cardItem = serializeCardItem(prod, Math.max(1, targetQty));
      reply = targetQty === 0 ? `Removed ${prod.name} from your cart.` : `Updated ${prod.name} quantity to ${targetQty} in your cart.`;
      actions = targetQty === 0
        ? [{ type: 'REMOVE_FROM_CART', product_id: prod.id, name: prod.name }]
        : [{ type: 'UPDATE_CART_QTY', product_id: prod.id, name: prod.name, quantity: targetQty, item: cardItem }];
      tools_used = [{ name: 'update_cart_quantity', args: { product_id: prod.id, quantity: targetQty } }];
      return { reply, voice_reply: reply, mode, actions, tools_used, follow_ups, latency_ms: 12 };
    }
    if (lower.includes('price')) {
      prod.price = val;
      prod.regular_price = val;
      prod.offer_price = val;
      reply = `${prod.name} price set to $${val.toFixed(2)}.`;
    } else {
      prod.stock_quantity = Math.round(val);
      prod.stock = prod.stock_quantity;
      reply = `${prod.name} stock set to ${prod.stock_quantity}.`;
    }
    actions = [{ type: 'PRODUCT_UPDATED', product: { id: prod.id, name: prod.name, price: prod.price, stock: prod.stock_quantity, stock_quantity: prod.stock_quantity, margin_pct: prod.margin_pct } }, { type: 'REFRESH_DATA' }];
    tools_used = [{ name: 'update_product_inventory', args: { product_name: prod.name } }];
  }
  // 7. Restock / PayPal Payout (Single or Bulk All Low-Stock)
  else if (lower.includes('restock') || lower.includes('payout') || lower.includes('supplier') || lower.includes('replenish all')) {
    if (lower.includes('all') || lower.includes('low stock')) {
      const lowProds = DEMO_PRODUCTS.filter((p) => p.stock_quantity <= 10);
      const targets = lowProds.length ? lowProds : DEMO_PRODUCTS.slice(0, 3);
      let totalPaid = 0;
      const names = [];
      for (const p of targets) {
        p.stock_quantity += 20;
        p.stock = p.stock_quantity;
        totalPaid += 20 * p.cost_price;
        names.push(p.name);
      }
      const receipt = {
        status: 'SUCCESS',
        payout_batch_id: `PAYOUT_BATCH_${Date.now().toString().slice(-6)}`,
        amount_paid: Number(totalPaid.toFixed(2)),
        supplier: 'wholesale@kirana.com',
        product: `${names.length} items (${names.slice(0, 3).join(', ')})`,
        quantity: names.length * 20,
        new_stock: 'Replenished (+20 each)',
      };
      reply = `Restocked ${names.length} low-stock items for $${totalPaid.toFixed(2)} total.`;
      actions = [{ type: 'PAYOUT_RECEIPT', receipt }, { type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'execute_supplier_restock_payout', args: { batch: names } }];
    } else {
      const prod = matchSingleProduct(prompt) || DEMO_PRODUCTS[0];
      const cleanedNum = lower.replace(/\$\d+(?:\.\d+)?|\d+\s*(?:lb|oz|ct|gal)\b/gi, '');
      const numMatch = cleanedNum.match(/\b(\d+)\b/);
      const qty = numMatch ? Number(numMatch[1]) : 15;
      prod.stock_quantity += qty;
      prod.stock = prod.stock_quantity;
      const paid = Number((qty * prod.cost_price).toFixed(2));
      const receipt = {
        status: 'SUCCESS',
        payout_batch_id: `PAYOUT_SBX_${Date.now().toString().slice(-6)}`,
        amount_paid: paid,
        supplier: 'wholesale@kirana.com',
        product: prod.name,
        quantity: qty,
        new_stock: prod.stock_quantity,
      };
      reply = `Paid $${paid.toFixed(2)} to restock ${qty} ${prod.name}.`;
      actions = [{ type: 'PAYOUT_RECEIPT', receipt }, { type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'execute_supplier_restock_payout', args: { product_name: prod.name, quantity: qty } }];
    }
  }
  // 8. Low stock check
  else if (lower.includes('low stock') || lower.includes('inventory health') || lower.includes('out of stock')) {
    const low = DEMO_PRODUCTS.filter((p) => p.stock_quantity <= 10).map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock_quantity,
      threshold: 10,
      recommended_reorder: 20,
      recommended_restock_qty: 20,
      unit_cost: p.cost_price,
      estimated_cost: Number((20 * p.cost_price).toFixed(2)),
      estimated_payout_usd: Number((20 * p.cost_price).toFixed(2)),
    }));
    const summary = low.slice(0, 3).map((i) => `${i.name} (${i.stock} left)`).join(', ');
    reply = low.length ? `${low.length} items low on stock: ${summary}.` : 'All store inventory is healthy.';
    actions = [{ type: 'LOW_STOCK_LIST', items: low }];
    tools_used = [{ name: 'get_inventory_health', args: {} }];
  }
  // 8b. Suite 1A: Zero-Click Order Placement ("place my order", "checkout now", "buy my cart", "pay with cod", "pay with wallet")
  else if (
    persona === 'shopper' &&
    ['place order', 'place my order', 'checkout now', 'complete order', 'complete checkout', 'buy my cart', 'order my cart', 'pay with cod', 'pay with cash', 'pay with wallet', 'instant checkout'].some((k) => lower.includes(k))
  ) {
    const payMethod = lower.includes('wallet') ? 'WALLET' : 'COD';
    const delivMode = lower.includes('pickup') ? 'PICKUP' : 'DELIVERY';
    const payLabel = payMethod === 'WALLET' ? 'Wallet' : 'Cash on Delivery';
    reply = `Placed your order with ${payLabel}.`;
    actions = [{ type: 'AUTO_CHECKOUT', payment_method: payMethod, delivery_mode: delivMode }];
    tools_used = [{ name: 'auto_place_order', args: { payment_method: payMethod, delivery_mode: delivMode } }];
  }
  // 8c. Suite 1B: Zero-Click Apply Promo Code ("apply promo SAVE10", "apply best coupon", "use coupon FRESH15")
  else if (
    persona === 'shopper' &&
    ['apply ', 'use ', 'best '].some((w) => lower.includes(w)) &&
    ['promo', 'coupon', 'code', 'save10', 'fresh15', 'flash'].some((w) => lower.includes(w))
  ) {
    const codeMatch = prompt.toUpperCase().match(/\b(SAVE\d+|FRESH\d+|FLASH\d+|[A-Z0-9]{5,12})\b/);
    const ignored = new Set(['APPLY', 'PROMO', 'COUPON', 'CODES', 'BEST', 'DISCOUNT', 'PLEASE']);
    const codeStr = codeMatch && !ignored.has(codeMatch[1]) ? codeMatch[1] : 'SAVE10';
    reply = `Applied promo code ${codeStr} to your cart.`;
    actions = [{ type: 'APPLY_PROMO', code: codeStr, discount_pct: 10 }];
    tools_used = [{ name: 'apply_promo_code', args: { code: codeStr } }];
  }
  // 8d. Suite 1C: Zero-Click Reorder Last Order ("reorder my last order", "repeat last order", "buy again")
  else if (
    persona === 'shopper' &&
    ['reorder', 'repeat last order', 'repeat my order', 'repeat previous order', 'buy again', 'same order again'].some((k) => lower.includes(k))
  ) {
    const catalog = getLiveCatalog();
    const cards = catalog.slice(0, 3).map((p) => serializeCardItem(p, 1));
    const totalVal = cards.reduce((s, c) => s + c.price * c.quantity, 0);
    reply = `Reordered ${cards.length} items from your last order ($${totalVal.toFixed(2)} total).`;
    actions = cards.map((c) => ({ type: 'ADD_TO_CART', item: c }));
    tools_used = [{ name: 'reorder_last_order', args: { count: cards.length } }];
  }
  // 8e. Suite 2A: Smart Budget Cart Builder ("build a cart under $20", "grocery bag under $15", "weekly essentials")
  else if (
    persona === 'shopper' &&
    (['build a cart', 'build cart', 'cart under', 'bag under', 'fill my cart', 'budget cart', 'weekly essential', 'essential bag', 'grocery bag'].some((k) => lower.includes(k)) ||
      ((lower.includes('cart') || lower.includes('bag')) && /(?:under|for|within)\s*\$?\d+/.test(lower)))
  ) {
    const bMatch = lower.match(/\$?(\d+(?:\.\d+)?)/);
    let budget = bMatch ? Number(bMatch[1]) : 20.0;
    if (budget < 3) budget = 15.0;
    const catalog = [...getLiveCatalog()].sort((a, b) => a.price - b.price);
    const chosen = [];
    let runningTotal = 0;
    for (const p of catalog) {
      if (runningTotal + p.price <= budget && chosen.length < 6) {
        chosen.push(serializeCardItem(p, 1));
        runningTotal += p.price;
      }
    }
    if (chosen.length === 0 && catalog.length > 0) {
      chosen.push(serializeCardItem(catalog[0], 1));
      runningTotal = chosen[0].price;
    }
    reply = `Added ${chosen.length} essentials to your cart for $${runningTotal.toFixed(2)} (within $${budget} budget).`;
    actions = chosen.map((c) => ({ type: 'ADD_TO_CART', item: c }));
    tools_used = [{ name: 'build_budget_cart', args: { budget, items_added: chosen.length } }];
  }
  // 8f. Suite 2B: Cheaper Alternative Swap ("swap with cheaper alternative", "replace expensive item", "cheaper option")
  else if (
    persona === 'shopper' &&
    ['swap', 'cheaper alternative', 'cheaper option', 'replace with cheaper', 'lower cost alternative'].some((k) => lower.includes(k))
  ) {
    const catalog = getLiveCatalog();
    const clientCart = Array.isArray(body.cart_items) ? body.cart_items : [];
    const highestCartItem = clientCart.length
      ? [...clientCart].sort((a, b) => Number(b.price || 0) - Number(a.price || 0))[0]
      : null;
    const cartMatchedProd = highestCartItem
      ? catalog.find((p) => Number(p.id) === Number(highestCartItem.id)) || matchSingleProduct(highestCartItem.name || '')
      : null;
    const targetProd = matchSingleProduct(prompt) || cartMatchedProd || [...catalog].sort((a, b) => b.price - a.price)[0];
    const cheaperCandidates = catalog.filter((p) => p.id !== targetProd.id && p.price < targetProd.price);
    const cheaperProd = cheaperCandidates.length
      ? cheaperCandidates.sort((a, b) => a.price - b.price)[0]
      : [...catalog].sort((a, b) => a.price - b.price)[0];
    const oldCard = serializeCardItem(targetProd, 1);
    const newCard = serializeCardItem(cheaperProd, 1);
    const savings = Math.max(0.50, Number((oldCard.price - newCard.price).toFixed(2)));
    reply = `Swapped ${oldCard.name} for ${newCard.name} at $${newCard.price.toFixed(2)} (saved $${savings.toFixed(2)}).`;
    actions = [
      { type: 'REMOVE_FROM_CART', product_id: oldCard.id, name: oldCard.name },
      { type: 'ADD_TO_CART', item: newCard },
      { type: 'SWAP_SUMMARY', removed: oldCard, added: newCard, savings },
    ];
    tools_used = [{ name: 'swap_cheaper_alternative', args: { removed: oldCard.name, added: newCard.name } }];
  }
  // 8g. Suite 4A/4B/4C: Switch Address, Wishlist/Favorites, Filter Orders
  else if (
    persona === 'shopper' &&
    ['switch address', 'change address', 'deliver to home', 'deliver to work', 'deliver to office', 'use home address', 'use work address'].some((k) => lower.includes(k))
  ) {
    const label = lower.includes('work') ? 'Work' : (lower.includes('office') ? 'Office' : 'Home');
    reply = `Switched your active delivery address to ${label}.`;
    actions = [{ type: 'SWITCH_ADDRESS', label }];
    tools_used = [{ name: 'switch_delivery_address', args: { label } }];
  } else if (
    persona === 'shopper' &&
    ['favorites to cart', 'wishlist to cart', 'buy my favorites', 'add all favorites'].some((k) => lower.includes(k))
  ) {
    reply = 'Added your saved favorites to your cart.';
    actions = [{ type: 'MOVE_FAVORITES_TO_CART' }];
    tools_used = [{ name: 'move_favorites_to_cart', args: {} }];
  } else if (
    persona === 'shopper' &&
    ['to favorites', 'to wishlist', 'save to favorite', 'favorite ', 'wishlist '].some((k) => lower.includes(k))
  ) {
    const prod = matchSingleProduct(prompt) || getLiveCatalog()[0];
    const card = serializeCardItem(prod, 1);
    reply = `Saved ${prod.name} to your favorites.`;
    actions = [{ type: 'TOGGLE_FAVORITE', product_id: prod.id, name: prod.name, item: card }];
    tools_used = [{ name: 'toggle_favorite_product', args: { product_id: prod.id } }];
  } else if (
    persona === 'shopper' &&
    lower.includes('order') &&
    ['delivered', 'cancelled', 'pending', 'processing', 'this month', 'filter'].some((k) => lower.includes(k))
  ) {
    const qTerm = lower.includes('delivered') ? 'DELIVERED' : (lower.includes('cancelled') ? 'CANCELLED' : (lower.includes('pending') ? 'PENDING' : ''));
    const path = qTerm ? `/profile/orders?q=${qTerm}` : '/profile/orders';
    reply = `Showing your ${qTerm.toLowerCase() || 'filtered'} orders.`;
    actions = [{ type: 'NAVIGATE', path }];
    tools_used = [{ name: 'filter_shopper_orders', args: { filter: qTerm } }];
  } else if (
    persona === 'owner' &&
    lower.includes('all ') &&
    ['dairy', 'bakery', 'produce', 'pantry'].some((c) => lower.includes(c)) &&
    ['discount', '% off', 'reduce price', 'stock', 'increase'].some((w) => lower.includes(w))
  ) {
    const catKw = ['dairy', 'bakery', 'produce', 'pantry'].find((c) => lower.includes(c)) || 'dairy';
    const pctMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
    const pctVal = pctMatch ? Number(pctMatch[1]) : 10;
    const catProds = DEMO_PRODUCTS.filter((p) => String(p.category || '').toLowerCase().includes(catKw));
    const targets = catProds.length ? catProds : DEMO_PRODUCTS.slice(0, 3);
    for (const p of targets) {
      if (lower.includes('stock')) {
        p.stock_quantity += Math.round(pctVal);
        p.stock = p.stock_quantity;
      } else {
        p.offer_price = Number((p.regular_price * (1 - Math.min(pctVal, 25) / 100)).toFixed(2));
        p.price = p.offer_price;
      }
    }
    reply = `Updated ${targets.length} ${catKw.charAt(0).toUpperCase() + catKw.slice(1)} products immediately.`;
    actions = [
      {
        type: 'BULK_INVENTORY_UPDATED',
        category: catKw.charAt(0).toUpperCase() + catKw.slice(1),
        count: targets.length,
        summary: `Updated ${targets.length} ${catKw} products`,
      },
      { type: 'REFRESH_DATA' },
    ];
    tools_used = [{ name: 'update_product_inventory', args: { category: catKw, count: targets.length } }];
  }
  // 9. Margin / Discount negotiation
  else if (lower.includes('margin') || lower.includes('discount') || lower.includes('% off') || lower.includes('bargain')) {
    const matchedProd = matchSingleProduct(prompt);
    if (lower.includes('%') || lower.includes('off') || lower.includes('discount') || lower.includes('bargain')) {
      const pctMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
      const reqPct = pctMatch ? Number(pctMatch[1]) : 15;
      const prod = matchedProd || DEMO_PRODUCTS[2];
      const approved = reqPct <= prod.max_safe_discount_pct;
      const dealPrice = approved ? Number((prod.price * (1 - reqPct / 100)).toFixed(2)) : prod.best_deal_price;
      const cardItem = serializeCardItem(prod, 1, dealPrice);
      const decision = {
        status: approved ? 'APPROVED' : 'COUNTER_OFFER',
        product: prod.name,
        original_price: prod.price,
        requested_discount_pct: reqPct,
        discount_approved_pct: approved ? reqPct : prod.max_safe_discount_pct,
        counter_discount_pct: prod.max_safe_discount_pct,
        final_price: dealPrice,
        counter_price: prod.best_deal_price,
        item: cardItem,
      };
      reply = approved
        ? `Approved ${reqPct}% off ${prod.name} at $${dealPrice.toFixed(2)}.`
        : `Max discount on ${prod.name} is ${prod.max_safe_discount_pct}% at $${prod.best_deal_price.toFixed(2)}.`;
      actions = [
        { type: 'MARGIN_DECISION', decision },
        ...(persona === 'shopper' ? [{ type: 'SEARCH_RESULTS', items: [cardItem] }] : []),
      ];
      tools_used = [{ name: 'bargain_and_guard_margin', args: { product_name: prod.name, requested_discount_pct: reqPct } }];
    } else if (matchedProd) {
      reply = `${matchedProd.name} has a ${matchedProd.margin_pct.toFixed(1)}% margin, selling at $${matchedProd.price.toFixed(2)} with $${matchedProd.cost_price.toFixed(2)} cost and ${matchedProd.max_safe_discount_pct.toFixed(1)}% max safe discount.`;
      actions = [{ type: 'MARGIN_LIST', products: [{ ...matchedProd, selling_price: matchedProd.price }] }];
      tools_used = [{ name: 'inspect_margin', args: { query: matchedProd.name } }];
    } else {
      reply = 'Store margins average 23.2%, well above the 12% protected floor.';
      actions = [{ type: 'MARGIN_LIST', products: DEMO_PRODUCTS.slice(0, 4).map((p) => ({ ...p, selling_price: p.price })) }];
      tools_used = [{ name: 'inspect_margin', args: {} }];
    }
  }
  // 10. Clear cart ("clear my cart", "remove the cart items", "remove all cart items")
  else if (
    ['clear cart', 'clear my cart', 'empty cart', 'empty my cart', 'remove the cart items', 'remove cart items', 'remove all cart items', 'remove all items from cart'].some((k) =>
      lower.includes(k)
    )
  ) {
    reply = 'Removed all items from your cart.';
    actions = [{ type: 'CLEAR_CART', removed_items: Array.isArray(body.cart_items) ? body.cart_items : [] }];
    tools_used = [{ name: 'clear_shopper_cart', args: {} }];
  }
  // 10b. Remove specific item(s) from cart
  else if ((lower.includes('remove ') || lower.includes('delete ')) && (lower.includes('cart') || lower.includes('bag') || matchSingleProduct(prompt))) {
    let itemsWithQty = extractItemsWithQuantities(prompt);
    if (itemsWithQty.length === 0) {
      const single = matchSingleProduct(prompt) || DEMO_PRODUCTS[0];
      itemsWithQty = [{ prod: single, qty: 1 }];
    }
    const serializedRemoved = itemsWithQty.map(({ prod, qty }) => serializeCardItem(prod, qty));
    const namesStr = itemsWithQty.map(({ prod }) => prod.name).join(', ');
    const firstCard = serializedRemoved[0];
    reply = `Removed ${namesStr} from your cart.`;
    actions = [
      {
        type: 'REMOVE_FROM_CART',
        product_id: firstCard.id,
        name: namesStr,
        item: firstCard,
        items: serializedRemoved,
      },
    ];
    tools_used = [{ name: 'remove_from_shopper_cart', args: { product_id: firstCard.id } }];
  }
  // 11. Multi-Item or Single-Item Add to Cart
  else if (
    !['how much', 'what is', 'cost of', 'price of', 'do you'].some((q) => lower.startsWith(q)) &&
    ['add ', 'put ', 'buy ', 'get me ', 'i want ', "i'll take ", 'to my cart', 'to cart'].some((w) => lower.includes(w))
  ) {
    let itemsWithQty = extractItemsWithQuantities(prompt);
    if (itemsWithQty.length === 0) {
      itemsWithQty = [{ prod: DEMO_PRODUCTS[0], qty: 1 }];
    }
    actions = [];
    tools_used = [];
    const parts = [];
    let grandTotal = 0;
    for (const { prod, qty } of itemsWithQty) {
      const cardItem = serializeCardItem(prod, qty);
      actions.push({ type: 'ADD_TO_CART', item: cardItem });
      tools_used.push({ name: 'add_to_shopper_cart', args: { product_name: prod.name, quantity: qty } });
      grandTotal += prod.price * qty;
      parts.push(`${qty} ${prod.name}`);
    }
    reply = parts.length === 1
      ? `Added ${parts[0]} for $${grandTotal.toFixed(2)}.`
      : `Added ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]} for $${grandTotal.toFixed(2)} total.`;
  }
  // 12. Recipe basket
  else if (['dinner', 'breakfast', 'smoothie', 'recipe', 'basket', 'meal', 'salad', 'ingredients'].some((k) => lower.includes(k))) {
    const recipe = lower.includes('breakfast') ? 'Breakfast' : (lower.includes('salad') ? 'Fresh Salad' : 'Pasta Dinner');
    const items = [DEMO_PRODUCTS[5], DEMO_PRODUCTS[6], DEMO_PRODUCTS[7], DEMO_PRODUCTS[1]].map((p) => serializeCardItem(p, 1));
    const total = items.reduce((s, i) => s + i.price, 0);
    reply = `${items.length} items for ${recipe} at $${total.toFixed(2)} total: ${items.slice(0, 3).map((i) => i.name).join(', ')}.`;
    actions = [{ type: 'RECOMMEND_BASKET', items, recipe }];
    tools_used = [{ name: 'recommend_recipe_basket', args: { recipe_name: recipe, budget: 20 } }];
  }
  // 13. Multi-Item Cost Calculation ("How much for 2 milk and 1 bread?")
  else if (['how much', 'total for', 'cost for', 'price for', 'cost of'].some((k) => lower.includes(k)) && extractItemsWithQuantities(prompt).length > 0 && (extractItemsWithQuantities(prompt).length > 1 || extractItemsWithQuantities(prompt)[0].qty > 1)) {
    const calcItems = extractItemsWithQuantities(prompt);
    let totalCost = 0;
    const parts = [];
    const cards = [];
    for (const { prod, qty } of calcItems) {
      const sub = prod.price * qty;
      totalCost += sub;
      parts.push(`${qty} ${prod.name} at $${sub.toFixed(2)}`);
      cards.push(serializeCardItem(prod, qty));
    }
    reply = `${parts.join(' plus ')} comes to $${totalCost.toFixed(2)} total.`;
    actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    tools_used = [{ name: 'search_products_and_stock', args: { query: prompt } }];
  }
  // 14. Specific Product Match Q&A (Price, Stock, Availability, Deals)
  else if (matchProductsFromText(prompt, 6).length > 0) {
    const matched = matchProductsFromText(prompt, 6);
    const cards = matched.map((p) => serializeCardItem(p, 1));
    if (matched.length === 1) {
      const p0 = matched[0];
      if (lower.includes('deal') || lower.includes('offer')) {
        reply = `${p0.name} is $${p0.price.toFixed(2)} per ${p0.unit} with ${p0.stock_quantity} in stock, and best deal is $${p0.best_deal_price.toFixed(2)} at ${p0.max_safe_discount_pct}% off.`;
      } else if (['how many', 'stock', 'available', 'have', 'left'].some((k) => lower.includes(k))) {
        reply = `${p0.name} has ${p0.stock_quantity} in stock at $${p0.price.toFixed(2)} per ${p0.unit}.`;
      } else {
        reply = `${p0.name} is $${p0.price.toFixed(2)} per ${p0.unit} with ${p0.stock_quantity} in stock.`;
      }
    } else {
      const summary = cards.slice(0, 3).map((c) => `${c.name} at $${c.price.toFixed(2)}`).join(', ');
      reply = `Found ${cards.length} matching items: ${summary}.`;
    }
    actions = [{ type: 'SEARCH_RESULTS', items: cards }];
    tools_used = [{ name: 'search_products_and_stock', args: { query: matched[0].name } }];
  }
  // 15. Category & Budget Browse ("dairy", "bakery", "produce", "pantry")
  else if (['dairy', 'bakery', 'produce', 'pantry', 'find', 'search', 'deal', 'grocer', 'under $'].some((k) => lower.includes(k))) {
    let filtered = [...DEMO_PRODUCTS];
    let label = 'store';
    if (lower.includes('dairy')) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes('dairy'));
      label = 'Dairy & Eggs';
    } else if (lower.includes('bakery')) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes('bakery'));
      label = 'Bakery';
    } else if (lower.includes('produce')) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes('produce'));
      label = 'Produce';
    } else if (lower.includes('pantry')) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes('pantry'));
      label = 'Pantry';
    }
    const items = filtered.slice(0, 6).map((p) => serializeCardItem(p, 1));
    const topNames = items.slice(0, 3).map((c) => `${c.name} ($${c.price.toFixed(2)})`).join(', ');
    reply = `${items.length} ${label} items available: ${topNames}.`;
    actions = [{ type: 'SEARCH_RESULTS', items }];
    tools_used = [{ name: 'search_products_and_stock', args: { query: label } }];
  }
  // 16. Live products / Catalog summary
  else {
    const items = DEMO_PRODUCTS.slice(0, 6).map((p) => serializeCardItem(p, 1));
    reply = `${DEMO_PRODUCTS.length} live products across 4 categories.`;
    actions = [{ type: 'CATALOG_SUMMARY', total: DEMO_PRODUCTS.length, in_stock: DEMO_PRODUCTS.length, categories: 4, items }];
    tools_used = [{ name: 'get_catalog_summary', args: {} }];
  }

  // Track last discussed product in session memory for follow-up pronouns
  for (const act of actions) {
    if (act.type === 'ADD_TO_CART' && act.item?.name) {
      mem.last_product = act.item.name;
      break;
    }
    if (act.type === 'MARGIN_DECISION' && act.decision?.product) {
      mem.last_product = act.decision.product;
      break;
    }
    if ((act.type === 'SEARCH_RESULTS' || act.type === 'LOW_STOCK_LIST') && act.items?.[0]?.name) {
      mem.last_product = act.items[0].name;
      break;
    }
    if (act.type === 'MARGIN_LIST' && act.products?.[0]?.name) {
      mem.last_product = act.products[0].name;
      break;
    }
  }

  if (mem.last_product && persona === 'shopper') {
    follow_ups = [`Add 1 ${mem.last_product} to my cart`, `Can I get 10% off ${mem.last_product}?`, 'What is the cheapest item?'];
  }

  const voiceReply = String(reply || 'Done.')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/(?:Order\s*)?#?ORD\d*0*(\d+)\b/gi, 'Order $1')
    .trim();

  mem.messages.push({ role: 'user', content: rawPrompt });
  mem.messages.push({ role: 'assistant', content: reply, voice_reply: voiceReply, mode, actions, tools_used, follow_ups, latency_ms: 14 });

  return {
    reply,
    voice_reply: voiceReply,
    mode,
    actions,
    tools_used,
    follow_ups,
    latency_ms: 14,
  };
}
