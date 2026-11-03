/**
 * Autonomous Client-Side Agentic Fallback for Cloud Previews (Lovable.dev / Static Hosting)
 * Only activates if the Django `/store/agent/chat/` endpoint is unreachable or returns 404
 * (e.g. when previewing inside Lovable's cloud container without a local backend tunnel).
 */

const SESSION_STORE = {};

const DEMO_PRODUCTS = [
  { id: 101, name: 'Organic Farm Whole Milk (1 Gal)', price: 4.50, cost_price: 3.60, stock_quantity: 8, category_name: 'Dairy', margin_pct: 20.0, max_safe_discount_pct: 9.0, best_deal_price: 4.10 },
  { id: 102, name: 'Artisanal Sourdough Bread', price: 5.50, cost_price: 4.00, stock_quantity: 14, category_name: 'Bakery', margin_pct: 27.3, max_safe_discount_pct: 17.3, best_deal_price: 4.55 },
  { id: 103, name: 'Fresh California Strawberries (1 lb)', price: 4.99, cost_price: 4.10, stock_quantity: 40, category_name: 'Produce', margin_pct: 17.8, max_safe_discount_pct: 6.6, best_deal_price: 4.66 },
  { id: 104, name: 'Pasture-Raised Brown Eggs (12 ct)', price: 5.99, cost_price: 4.70, stock_quantity: 6, category_name: 'Dairy', margin_pct: 21.5, max_safe_discount_pct: 10.8, best_deal_price: 5.35 },
  { id: 105, name: 'Organic Hass Avocados (Bag of 4)', price: 6.50, cost_price: 5.10, stock_quantity: 5, category_name: 'Produce', margin_pct: 21.5, max_safe_discount_pct: 10.8, best_deal_price: 5.80 },
  { id: 106, name: 'Imported Bronze-Cut Penne Pasta', price: 3.50, cost_price: 2.50, stock_quantity: 25, category_name: 'Pantry', margin_pct: 28.6, max_safe_discount_pct: 18.9, best_deal_price: 2.84 },
  { id: 107, name: 'San Marzano Tomato Basil Sauce', price: 6.50, cost_price: 4.80, stock_quantity: 18, category_name: 'Pantry', margin_pct: 26.2, max_safe_discount_pct: 16.0, best_deal_price: 5.45 },
  { id: 108, name: 'Aged Parmigiano Reggiano Wedge', price: 5.50, cost_price: 4.20, stock_quantity: 12, category_name: 'Dairy', margin_pct: 23.6, max_safe_discount_pct: 13.1, best_deal_price: 4.78 },
  { id: 109, name: 'Creamy Greek Honey Yogurt', price: 4.99, cost_price: 3.80, stock_quantity: 9, category_name: 'Dairy', margin_pct: 23.8, max_safe_discount_pct: 13.4, best_deal_price: 4.32 },
];

const DEMO_ORDERS = [
  { id: 'ORD202600005', status: 'READY', customer: 'Alex Rivera', total_amount: 46.80, authorized_amount: 54.00, captured_amount: 46.80, released_amount: 7.20, items_count: 4 },
  { id: 'ORD202600004', status: 'PREPARING', customer: 'Priya Sharma', total_amount: 32.50, authorized_amount: 37.38, captured_amount: 0, released_amount: 0, items_count: 3 },
  { id: 'ORD202600003', status: 'ACCEPTED', customer: 'Marcus Vance', total_amount: 28.90, authorized_amount: 33.24, captured_amount: 0, released_amount: 0, items_count: 3 },
  { id: 'ORD202600002', status: 'NEW', customer: 'Elena Rostova', total_amount: 50.00, authorized_amount: 57.50, captured_amount: 0, released_amount: 0, items_count: 5 },
];

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
  const persona = String(body.persona || params.persona || 'owner').toLowerCase();
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

  const prompt = String(body.prompt || body.message || '').trim();
  const lower = prompt.toLowerCase();
  const mem = SESSION_STORE[key];

  let reply = 'Ready to assist.';
  let actions = [];
  let tools_used = [{ name: 'live_store_memory', args: {} }];
  let follow_ups = persona === 'owner'
    ? ['Check pending orders', 'Check low stock', 'Audit profit margins']
    : ['Suggest a pasta dinner basket under $20', 'Add 1 Organic Milk to my cart', 'Can I get 15% off Strawberries?'];

  // 0. Strict Settings Guardrail (Block all Settings access/modifications)
  if (
    lower.includes('setting') ||
    lower.includes('operating hour') ||
    lower.includes('delivery radius') ||
    lower.includes('change store name') ||
    lower.includes('change password')
  ) {
    reply = 'Settings are restricted and cannot be accessed or modified by AI. Please update Settings manually.';
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
      reply = 'Navigating to Orders Portal.';
      actions = [{ type: 'NAVIGATE', path, label: 'Orders' }];
    } else if (lower.includes('product') || lower.includes('catalog') || lower.includes('inventory')) {
      const path = persona === 'owner' ? '/owner/products' : '/products';
      reply = 'Navigating to Products & Inventory.';
      actions = [{ type: 'NAVIGATE', path, label: 'Products' }];
    } else if (lower.includes('categor')) {
      const path = persona === 'owner' ? '/owner/categories' : '/categories';
      reply = 'Navigating to Categories.';
      actions = [{ type: 'NAVIGATE', path, label: 'Categories' }];
    } else if (lower.includes('offer') || lower.includes('promo') || lower.includes('coupon')) {
      const path = persona === 'owner' ? '/owner/offers' : '/profile/offers';
      reply = 'Navigating to Offers & Promo Codes.';
      actions = [{ type: 'NAVIGATE', path, label: 'Offers' }];
    } else if (lower.includes('sale') || lower.includes('revenue')) {
      reply = 'Navigating to Sales Analytics.';
      actions = [{ type: 'NAVIGATE', path: '/owner/sales', label: 'Sales' }];
    } else if (lower.includes('customer')) {
      reply = 'Navigating to Customers.';
      actions = [{ type: 'NAVIGATE', path: '/owner/customers', label: 'Customers' }];
    } else if (lower.includes('invoice')) {
      reply = 'Navigating to Invoices.';
      actions = [{ type: 'NAVIGATE', path: '/owner/invoices', label: 'Invoices' }];
    } else if (lower.includes('delivery')) {
      reply = 'Navigating to Delivery Fleet.';
      actions = [{ type: 'NAVIGATE', path: '/owner/delivery-partners', label: 'Delivery' }];
    } else if (lower.includes('dashboard') || lower.includes('analytics')) {
      reply = 'Navigating to Owner Dashboard.';
      actions = [{ type: 'NAVIGATE', path: '/owner', label: 'Dashboard' }];
    } else if (lower.includes('checkout')) {
      reply = 'Navigating to PayPal Checkout.';
      actions = [{ type: 'NAVIGATE', path: '/checkout', label: 'Checkout' }];
    } else if (lower.includes('cart')) {
      reply = 'Opening your shopping cart.';
      actions = [{ type: 'NAVIGATE', path: '/cart', label: 'Cart' }];
    }
    tools_used = [{ name: 'navigate_portal', args: {} }];
  }
  // 1b. Create / Delete Product
  else if (/(create|add|new|delete|remove)\s+product/.test(lower)) {
    if (lower.includes('delete') || lower.includes('remove')) {
      reply = 'Removed product from the store catalog.';
      actions = [{ type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'create_or_delete_product', args: { action: 'delete' } }];
    } else {
      const priceMatch = lower.match(/\$?(\d+(?:\.\d+)?)/);
      const price = priceMatch ? Number(priceMatch[1]) : 4.99;
      const newProd = { id: Date.now(), name: 'Organic Honey', price, cost_price: Number((price * 0.78).toFixed(2)), stock_quantity: 25, category_name: 'Pantry', margin_pct: 22.0, max_safe_discount_pct: 10.0, best_deal_price: Number((price * 0.9).toFixed(2)) };
      DEMO_PRODUCTS.unshift(newProd);
      reply = `Created product '${newProd.name}' at $${price.toFixed(2)} (25 units in stock).`;
      actions = [{ type: 'PRODUCT_UPDATED', product: newProd }, { type: 'REFRESH_DATA' }];
      tools_used = [{ name: 'create_or_delete_product', args: { action: 'create', price } }];
    }
  }
  // 1c. Categories, Promo Codes, Sales, Customers, Broadcast
  else if (lower.includes('categor')) {
    reply = '4 active categories: Dairy (4), Produce (2), Pantry (2), Bakery (1).';
    tools_used = [{ name: 'manage_category', args: { action: 'list' } }];
  } else if (lower.includes('promo') || lower.includes('coupon')) {
    if (lower.includes('create') || lower.includes('add')) {
      reply = 'Created promo code SAVE10 (10% off).';
      actions = [{ type: 'REFRESH_DATA' }];
    } else {
      reply = 'Active promo codes: SAVE10 (10% off), FRESH15 (15% off orders over $25).';
    }
    tools_used = [{ name: 'manage_promo_code', args: {} }];
  } else if (lower.includes('sales') || lower.includes('revenue') || lower.includes('aov')) {
    reply = 'Sales Summary: $1,842.50 total volume across 52 orders (AOV: $35.43 • PayPal Captured: $1,690.10 • Auto-Released: $152.40).';
    tools_used = [{ name: 'get_sales_and_analytics', args: {} }];
  } else if (lower.includes('broadcast') || lower.includes('notify customer')) {
    reply = 'Broadcast sent to active store customers.';
    actions = [{ type: 'REFRESH_DATA' }];
    tools_used = [{ name: 'send_customer_broadcast', args: {} }];
  }
  // 2. Recent order / Order ID
  else if (lower.includes('recent order') || lower.includes('latest order') || lower.includes('last order') || lower.includes('order number')) {
    const top = DEMO_ORDERS[0];
    mem.last_order_id = top.id;
    reply = `Latest Order: #${top.id} • ${top.status} • $${top.total_amount.toFixed(2)} (${top.customer})`;
    actions = [{ type: 'ORDER_CARD', order: top }];
    tools_used = [{ name: 'get_latest_order', args: {} }];
    follow_ups = [`Settle order ${top.id}`, 'Check pending orders', 'Check low stock'];
  }
  // 3. Pending orders
  else if (lower.includes('pending') && lower.includes('order')) {
    const pending = DEMO_ORDERS.filter((o) => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status));
    reply = `${pending.length} orders pending packing & PayPal capture.`;
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
    reply = `Settled Order #${found.id}: Captured $${found.captured_amount.toFixed(2)}, Released $${found.released_amount.toFixed(2)}.`;
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
    reply = `Updated Order #${found.id} status to ${found.status}.`;
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
      reply = `Updated ${prod.name}: price set to $${val.toFixed(2)}.`;
    } else {
      prod.stock_quantity = Math.round(val);
      reply = `Updated ${prod.name}: stock set to ${prod.stock_quantity} units.`;
    }
    actions = [{ type: 'PRODUCT_UPDATED', product: { id: prod.id, name: prod.name, price: prod.price, stock_quantity: prod.stock_quantity, margin_pct: prod.margin_pct, changes: [reply] } }, { type: 'REFRESH_DATA' }];
    tools_used = [{ name: 'update_product_inventory', args: { product_name: prod.name } }];
  }
  // 7. Restock / PayPal Payout
  else if (lower.includes('restock') || lower.includes('payout') || lower.includes('supplier')) {
    const prod = DEMO_PRODUCTS.find((p) => lower.includes(p.name.split(' ')[0].toLowerCase())) || DEMO_PRODUCTS[0];
    const numMatch = lower.match(/\b(\d+)\b/);
    const qty = numMatch ? Number(numMatch[1]) : 15;
    prod.stock_quantity += qty;
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
    reply = `PayPal Payout Sent: $${paid.toFixed(2)} to wholesale@kirana.com for ${qty}x ${prod.name} (Stock: ${prod.stock_quantity}).`;
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
      recommended_restock_qty: 20,
      unit_cost: p.cost_price,
      estimated_payout_usd: Number((20 * p.cost_price).toFixed(2)),
    }));
    reply = `${low.length} items need restocking.`;
    actions = [{ type: 'LOW_STOCK_LIST', items: low }];
    tools_used = [{ name: 'get_inventory_health', args: {} }];
  }
  // 9. Margin / Discount negotiation
  else if (lower.includes('margin') || lower.includes('discount') || lower.includes('% off') || lower.includes('bargain')) {
    if (lower.includes('%') || lower.includes('off') || persona === 'shopper') {
      const pctMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
      const reqPct = pctMatch ? Number(pctMatch[1]) : 15;
      const prod = DEMO_PRODUCTS.find((p) => lower.includes(p.name.split(' ')[0].toLowerCase()) || lower.includes('strawberr')) || DEMO_PRODUCTS[2];
      const approved = reqPct <= prod.max_safe_discount_pct;
      const decision = {
        status: approved ? 'APPROVED' : 'COUNTER_OFFER',
        product: prod.name,
        original_price: prod.price,
        requested_discount_pct: reqPct,
        discount_approved_pct: approved ? reqPct : prod.max_safe_discount_pct,
        counter_discount_pct: prod.max_safe_discount_pct,
        final_price: Number((prod.price * (1 - reqPct / 100)).toFixed(2)),
        counter_price: prod.best_deal_price,
        item: { id: prod.id, name: prod.name, price: approved ? Number((prod.price * (1 - reqPct / 100)).toFixed(2)) : prod.best_deal_price, quantity: 1 },
      };
      reply = approved
        ? `Approved ${reqPct}% off on ${prod.name} ($${decision.final_price.toFixed(2)}).`
        : `Rejected ${reqPct}% off to protect 12% margin. Max safe discount: ${prod.max_safe_discount_pct}% ($${prod.best_deal_price.toFixed(2)}).`;
      actions = [{ type: 'MARGIN_DECISION', decision }];
      tools_used = [{ name: 'bargain_and_guard_margin', args: { product_name: prod.name, requested_discount_pct: reqPct } }];
    } else {
      reply = `Catalog avg margin: 23.4% across ${DEMO_PRODUCTS.length} products (12% floor protected).`;
      actions = [{ type: 'MARGIN_LIST', products: DEMO_PRODUCTS.slice(0, 4) }];
      tools_used = [{ name: 'inspect_margin', args: {} }];
    }
  }
  // 10. Clear cart
  else if ((lower.includes('clear') || lower.includes('empty')) && (lower.includes('cart') || lower.includes('bag'))) {
    reply = 'Cleared all items from your shopping cart.';
    actions = [{ type: 'CLEAR_CART' }];
    tools_used = [{ name: 'clear_shopper_cart', args: {} }];
  }
  // 11. Add to cart
  else if (lower.startsWith('add ') || lower.startsWith('buy ') || lower.includes('to my cart') || lower.includes('to cart')) {
    const qtyMatch = lower.match(/\b(\d+)\b/);
    const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
    const prod = DEMO_PRODUCTS.find((p) => lower.includes(p.name.split(' ')[0].toLowerCase()) || lower.includes('milk') || lower.includes('bread') || lower.includes('egg') || lower.includes('strawberr')) || DEMO_PRODUCTS[0];
    const item = { id: prod.id, name: prod.name, price: prod.price, quantity: qty, stock: prod.stock_quantity };
    reply = `Added ${qty}x ${prod.name} ($${prod.price.toFixed(2)}) to your cart.`;
    actions = [{ type: 'ADD_TO_CART', item }];
    tools_used = [{ name: 'add_to_shopper_cart', args: { product_name: prod.name, quantity: qty } }];
  }
  // 12. Recipe basket
  else if (['pasta', 'dinner', 'breakfast', 'smoothie', 'recipe', 'basket'].some((k) => lower.includes(k))) {
    const items = [DEMO_PRODUCTS[5], DEMO_PRODUCTS[6], DEMO_PRODUCTS[7], DEMO_PRODUCTS[1]].map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      quantity: 1,
    }));
    const total = items.reduce((s, i) => s + i.price, 0);
    reply = `Italian Pasta Dinner Basket ready ($${total.toFixed(2)} total for ${items.length} items).`;
    actions = [{ type: 'RECOMMEND_BASKET', items, recipe: 'Italian Pasta Dinner' }];
    tools_used = [{ name: 'recommend_recipe_basket', args: { recipe_name: 'Italian Pasta Dinner', budget: 20 } }];
  }
  // 13. Live products / Catalog summary
  else {
    reply = `${DEMO_PRODUCTS.length} live products (${DEMO_PRODUCTS.length} in stock) across 4 categories.`;
    actions = [{ type: 'CATALOG_SUMMARY', active_count: DEMO_PRODUCTS.length, in_stock_count: DEMO_PRODUCTS.length, products: DEMO_PRODUCTS.slice(0, 5) }];
    tools_used = [{ name: 'get_catalog_summary', args: {} }];
  }

  mem.messages.push({ role: 'user', content: prompt });
  mem.messages.push({ role: 'assistant', content: reply, actions, tools_used, follow_ups, latency_ms: 18 });

  return {
    reply,
    actions,
    tools_used,
    follow_ups,
    latency_ms: 18,
  };
}
