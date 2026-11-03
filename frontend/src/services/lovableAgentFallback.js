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

  const scored = [];
  for (const p of DEMO_PRODUCTS) {
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
  const map = [
    [/\btwenty[\s-]+five\b/gi, '25'],
    [/\btwenty\b/gi, '20'],
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
  ];
  for (const [re, digit] of map) {
    out = out.replace(re, digit);
  }
  out = out.replace(/(\d+(?:\.\d+)?)\s*(?:percent|per\s+cent)\b/gi, '$1%');
  out = out.replace(/\b(\d+(?:\.\d+)?)\s*dollars?\b/gi, '$$$1');
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

  // 0. Strict Settings Guardrail
  if (
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
  } else if (lower.includes('promo') || lower.includes('coupon')) {
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
  else if (lower.includes('recent order') || lower.includes('latest order') || lower.includes('last order') || lower.includes('order number')) {
    const top = DEMO_ORDERS[0];
    mem.last_order_id = top.id;
    reply = `Order #${top.id} is ${top.status} for $${top.total_amount.toFixed(2)}.`;
    actions = [{ type: 'ORDER_CARD', order: top }];
    tools_used = [{ name: 'get_latest_order', args: {} }];
    follow_ups = [`Settle order ${top.id}`, 'Check pending orders', 'Check low stock'];
  }
  // 3. Pending orders
  else if (lower.includes('pending') && lower.includes('order')) {
    const pending = DEMO_ORDERS.filter((o) => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status));
    reply = pending.length
      ? `${pending.length} orders pending packing, starting with #${pending[0].id} for ${pending[0].customer} at $${pending[0].total_amount.toFixed(2)}.`
      : 'No pending orders.';
    actions = [{ type: 'PENDING_ORDERS', orders: pending }];
    tools_used = [{ name: 'get_pending_packing_orders', args: {} }];
  }
  // 4. Settle order
  else if (lower.includes('settle') || lower.includes('capture')) {
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
  // 5. Accept / Prepare / Dispatch / Deliver order
  else if (['accept', 'prepare', 'dispatch', 'deliver', 'reject', 'cancel'].some((w) => lower.includes(w)) && (lower.includes('order') || /ord\d+/i.test(lower))) {
    const ordMatch = lower.match(/\b(ord\d+\w*)\b/i);
    const targetId = ordMatch ? ordMatch[1].toUpperCase() : (mem.last_order_id || 'ORD202600002');
    const found = DEMO_ORDERS.find((o) => o.id === targetId) || DEMO_ORDERS[3];
    if (lower.includes('accept')) found.status = 'ACCEPTED';
    else if (lower.includes('prepare')) found.status = 'PREPARING';
    else if (lower.includes('dispatch')) found.status = 'OUT_FOR_DELIVERY';
    else if (lower.includes('deliver')) found.status = 'DELIVERED';
    else found.status = 'REJECTED';
    reply = `Order #${found.id} marked ${found.status}.`;
    actions = [{ type: 'ORDER_CARD', order: found }, { type: 'REFRESH_DATA' }];
    tools_used = [{ name: 'update_order_status', args: { order_id: found.id, new_status: found.status } }];
  }
  // 6. Update product stock or price
  else if ((lower.includes('update') || lower.includes('set') || lower.includes('change')) && (lower.includes('stock') || lower.includes('price'))) {
    const prod = matchSingleProduct(prompt) || DEMO_PRODUCTS[0];
    const numMatch = lower.match(/(\d+(?:\.\d+)?)/g);
    const val = numMatch ? Number(numMatch[numMatch.length - 1]) : 40;
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
  // 7. Restock / PayPal Payout
  else if (lower.includes('restock') || lower.includes('payout') || lower.includes('supplier')) {
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
  // 10. Clear cart
  else if ((lower.includes('clear') || lower.includes('empty')) && (lower.includes('cart') || lower.includes('bag'))) {
    reply = 'Cleared your cart.';
    actions = [{ type: 'CLEAR_CART' }];
    tools_used = [{ name: 'clear_shopper_cart', args: {} }];
  }
  // 10b. Remove from cart
  else if ((lower.includes('remove ') || lower.includes('delete ')) && (lower.includes('cart') || lower.includes('bag'))) {
    const prod = matchSingleProduct(prompt) || DEMO_PRODUCTS[0];
    reply = `Removed ${prod.name} from your cart.`;
    actions = [{ type: 'REMOVE_FROM_CART', product_id: prod.id, name: prod.name }];
    tools_used = [{ name: 'remove_from_shopper_cart', args: { product_id: prod.id } }];
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

  mem.messages.push({ role: 'user', content: rawPrompt });
  mem.messages.push({ role: 'assistant', content: reply, voice_reply: reply, mode, actions, tools_used, follow_ups, latency_ms: 14 });

  return {
    reply,
    voice_reply: reply,
    mode,
    actions,
    tools_used,
    follow_ups,
    latency_ms: 14,
  };
}
