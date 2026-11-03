/**
 * Client-Side Data Contract Fallback for Cloud Previews (Lovable.dev / Static Hosting)
 * Only activates if the Django `/store/agent/chat/` endpoint is unreachable or returns 404.
 * Mirrors the exact backend response contract (`reply`, `voice_reply`, `mode`, `actions`, `tools_used`, `follow_ups`).
 */

const SESSION_STORE = {};

const DEMO_PRODUCTS = [
  { id: 101, name: 'Organic Farm Whole Milk', unit: '1 Gal', price: 4.50, regular_price: 4.50, offer_price: 4.50, cost_price: 3.60, stock: 8, stock_quantity: 8, category: 'Dairy', category_name: 'Dairy', margin_pct: 20.0, max_safe_discount_pct: 9.0, best_deal_price: 4.10, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=240&q=80' },
  { id: 102, name: 'Artisanal Sourdough Bread', unit: '1 Loaf', price: 5.50, regular_price: 5.50, offer_price: 5.50, cost_price: 4.00, stock: 14, stock_quantity: 14, category: 'Bakery', category_name: 'Bakery', margin_pct: 27.3, max_safe_discount_pct: 17.3, best_deal_price: 4.55, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=240&q=80' },
  { id: 103, name: 'Fresh California Strawberries', unit: '1 lb', price: 4.99, regular_price: 4.99, offer_price: 4.99, cost_price: 4.10, stock: 40, stock_quantity: 40, category: 'Produce', category_name: 'Produce', margin_pct: 17.8, max_safe_discount_pct: 6.6, best_deal_price: 4.66, image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=240&q=80' },
  { id: 104, name: 'Pasture-Raised Brown Eggs', unit: '12 ct', price: 5.99, regular_price: 5.99, offer_price: 5.99, cost_price: 4.70, stock: 6, stock_quantity: 6, category: 'Dairy', category_name: 'Dairy', margin_pct: 21.5, max_safe_discount_pct: 10.8, best_deal_price: 5.35, image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=240&q=80' },
  { id: 105, name: 'Organic Hass Avocados', unit: 'Bag of 4', price: 6.50, regular_price: 6.50, offer_price: 6.50, cost_price: 5.10, stock: 5, stock_quantity: 5, category: 'Produce', category_name: 'Produce', margin_pct: 21.5, max_safe_discount_pct: 10.8, best_deal_price: 5.80, image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=240&q=80' },
  { id: 106, name: 'Bronze-Cut Penne Pasta', unit: '16 oz', price: 3.50, regular_price: 3.50, offer_price: 3.50, cost_price: 2.50, stock: 25, stock_quantity: 25, category: 'Pantry', category_name: 'Pantry', margin_pct: 28.6, max_safe_discount_pct: 18.9, best_deal_price: 2.84, image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=240&q=80' },
  { id: 107, name: 'San Marzano Marinara Sauce', unit: '24 oz', price: 6.50, regular_price: 6.50, offer_price: 6.50, cost_price: 4.80, stock: 18, stock_quantity: 18, category: 'Pantry', category_name: 'Pantry', margin_pct: 26.2, max_safe_discount_pct: 16.0, best_deal_price: 5.45, image: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=240&q=80' },
  { id: 108, name: 'Aged Parmigiano Reggiano', unit: '8 oz', price: 5.50, regular_price: 5.50, offer_price: 5.50, cost_price: 4.20, stock: 12, stock_quantity: 12, category: 'Dairy', category_name: 'Dairy', margin_pct: 23.6, max_safe_discount_pct: 13.1, best_deal_price: 4.78, image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=240&q=80' },
  { id: 109, name: 'Greek Honey Yogurt', unit: '32 oz', price: 4.99, regular_price: 4.99, offer_price: 4.99, cost_price: 3.80, stock: 9, stock_quantity: 9, category: 'Dairy', category_name: 'Dairy', margin_pct: 23.8, max_safe_discount_pct: 13.4, best_deal_price: 4.32, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=240&q=80', thumbnail: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=240&q=80' },
];

const DEMO_ORDERS = [
  { id: 'ORD202600005', status: 'READY', customer: 'Alex Rivera', total_amount: 46.80, authorized_amount: 54.00, captured_amount: 46.80, released_amount: 7.20, items_count: 4 },
  { id: 'ORD202600004', status: 'PREPARING', customer: 'Priya Sharma', total_amount: 32.50, authorized_amount: 37.38, captured_amount: 0, released_amount: 0, items_count: 3, can_settle: true },
  { id: 'ORD202600003', status: 'ACCEPTED', customer: 'Marcus Vance', total_amount: 28.90, authorized_amount: 33.24, captured_amount: 0, released_amount: 0, items_count: 3, can_settle: true },
  { id: 'ORD202600002', status: 'NEW', customer: 'Elena Rostova', total_amount: 50.00, authorized_amount: 57.50, captured_amount: 0, released_amount: 0, items_count: 5, can_settle: true },
];

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
    SESSION_STORE[key] = { session_id: sessionId, persona, messages: [], last_order_id: 'ORD202600005' };
  }

  if (method === 'delete') {
    SESSION_STORE[key] = { session_id: sessionId, persona, messages: [], last_order_id: null };
    return { status: 'cleared', messages: [] };
  }

  if (method === 'get') {
    return SESSION_STORE[key];
  }

  const rawPrompt = String(body.prompt || body.message || '').trim();
  const prompt = normalizeVoiceTranscript(rawPrompt);
  const lower = prompt.toLowerCase();
  const mem = SESSION_STORE[key];

  let reply = 'How can I help?';
  let actions = [];
  let tools_used = [{ name: 'live_store_memory', args: {} }];
  let follow_ups = persona === 'owner'
    ? ['Check pending orders', 'Check low stock', 'Check profit margins']
    : ['Plan a dinner basket', 'Add 1 Whole Milk', '15% off Strawberries'];

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
  // 1b. Create / Delete Product
  else if (/(create|add|new|delete|remove)\s+product/.test(lower)) {
    if (lower.includes('delete') || lower.includes('remove')) {
      reply = 'Product removed.';
      actions = [{ type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'create_or_delete_product', args: { action: 'delete' } }];
    } else {
      const priceMatch = lower.match(/\$?(\d+(?:\.\d+)?)/);
      const price = priceMatch ? Number(priceMatch[1]) : 4.99;
      const newProd = { id: Date.now(), name: 'Organic Honey', unit: '12 oz', price, regular_price: price, offer_price: price, cost_price: Number((price * 0.78).toFixed(2)), stock: 25, stock_quantity: 25, category: 'Pantry', category_name: 'Pantry', margin_pct: 22.0, max_safe_discount_pct: 10.0, best_deal_price: Number((price * 0.9).toFixed(2)) };
      DEMO_PRODUCTS.unshift(newProd);
      reply = `Added ${newProd.name} at $${price.toFixed(2)}.`;
      actions = [{ type: 'PRODUCT_UPDATED', product: newProd }, { type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'create_or_delete_product', args: { action: 'create', price } }];
    }
  }
  // 1c. Categories, Promo Codes, Sales, Customers, Broadcast
  else if (lower.includes('categor')) {
    reply = '4 categories: Dairy, Produce, Pantry, Bakery.';
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
    reply = `${pending.length} orders are pending.`;
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
    const prod = DEMO_PRODUCTS.find((p) => lower.includes(p.name.split(' ')[0].toLowerCase()) || lower.includes('strawberr') || lower.includes('milk')) || DEMO_PRODUCTS[2];
    const numMatch = lower.match(/(\d+(?:\.\d+)?)/);
    const val = numMatch ? Number(numMatch[1]) : 40;
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
    const prod = DEMO_PRODUCTS.find((p) => lower.includes(p.name.split(' ')[0].toLowerCase()) || lower.includes('milk') || lower.includes('strawberr')) || DEMO_PRODUCTS[0];
    const numMatch = lower.match(/\b(\d+)\b/);
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
    reply = `${low.length} items are low on stock.`;
    actions = [{ type: 'LOW_STOCK_LIST', items: low }];
    tools_used = [{ name: 'get_inventory_health', args: {} }];
  }
  // 9. Margin / Discount negotiation
  else if (lower.includes('margin') || lower.includes('discount') || lower.includes('% off') || lower.includes('bargain')) {
    if (lower.includes('%') || lower.includes('off') || persona === 'shopper') {
      const pctMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
      const reqPct = pctMatch ? Number(pctMatch[1]) : 15;
      const prod = DEMO_PRODUCTS.find((p) => lower.includes(p.name.split(' ')[0].toLowerCase()) || lower.includes('strawberr') || lower.includes('milk')) || DEMO_PRODUCTS[2];
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
    } else {
      reply = 'Margins are above the 12% floor.';
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
    const prod = DEMO_PRODUCTS.find((p) => lower.includes(p.name.split(' ')[0].toLowerCase()) || lower.includes('milk') || lower.includes('bread') || lower.includes('strawberr')) || DEMO_PRODUCTS[0];
    reply = `Removed ${prod.name}.`;
    actions = [{ type: 'REMOVE_FROM_CART', product_id: prod.id, name: prod.name }];
    tools_used = [{ name: 'remove_from_shopper_cart', args: { product_id: prod.id } }];
  }
  // 11. Add to cart
  else if (lower.startsWith('add ') || lower.startsWith('buy ') || lower.includes('to my cart') || lower.includes('to cart')) {
    const qtyMatch = lower.match(/\b(\d+)\b/);
    const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
    const prod = DEMO_PRODUCTS.find((p) => lower.includes(p.name.split(' ')[0].toLowerCase()) || lower.includes('milk') || lower.includes('bread') || lower.includes('egg') || lower.includes('strawberr')) || DEMO_PRODUCTS[0];
    const item = serializeCardItem(prod, qty);
    reply = `Added ${qty} ${prod.name}.`;
    actions = [{ type: 'ADD_TO_CART', item }];
    tools_used = [{ name: 'add_to_shopper_cart', args: { product_name: prod.name, quantity: qty } }];
  }
  // 12. Recipe basket
  else if (['pasta', 'dinner', 'breakfast', 'smoothie', 'recipe', 'basket', 'meal'].some((k) => lower.includes(k))) {
    const recipe = lower.includes('breakfast') ? 'Breakfast' : (lower.includes('salad') ? 'Fresh Salad' : 'Pasta Dinner');
    const items = [DEMO_PRODUCTS[5], DEMO_PRODUCTS[6], DEMO_PRODUCTS[7], DEMO_PRODUCTS[1]].map((p) => serializeCardItem(p, 1));
    reply = `${items.length} items for ${recipe}.`;
    actions = [{ type: 'RECOMMEND_BASKET', items, recipe }];
    tools_used = [{ name: 'recommend_recipe_basket', args: { recipe_name: recipe, budget: 20 } }];
  }
  // 13. Search / Find groceries / Deals
  else if (persona === 'shopper' || ['find', 'search', 'deal', 'grocer', 'milk', 'bread', 'egg', 'strawberr', 'avocado'].some((k) => lower.includes(k))) {
    const matched = DEMO_PRODUCTS.filter((p) =>
      lower.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().split(' ').some((w) => w.length >= 3 && lower.includes(w))
    );
    const items = (matched.length > 0 ? matched : DEMO_PRODUCTS.slice(0, 4)).map((p) => serializeCardItem(p, 1));
    reply = `Found ${items.length} items.`;
    actions = [{ type: 'SEARCH_RESULTS', items }];
    tools_used = [{ name: 'search_products_and_stock', args: { query: prompt } }];
  }
  // 14. Live products / Catalog summary
  else {
    const items = DEMO_PRODUCTS.slice(0, 6).map((p) => serializeCardItem(p, 1));
    reply = `${DEMO_PRODUCTS.length} live products across 4 categories.`;
    actions = [{ type: 'CATALOG_SUMMARY', total: DEMO_PRODUCTS.length, in_stock: DEMO_PRODUCTS.length, categories: 4, items }];
    tools_used = [{ name: 'get_catalog_summary', args: {} }];
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
