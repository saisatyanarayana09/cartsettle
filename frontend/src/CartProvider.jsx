import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { clearAllBrowserCaches } from './services/api'

import { CartContext } from './cart-context';
import { useWebSocket } from './hooks/useWebSocket';
const getUser = () => {
  try {
    const raw = localStorage.getItem('smart-kirana-customer-user');
    return raw && raw !== 'undefined' ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const LOCAL_CART_KEY = 'smart-kirana-customer-cart-cache';
const getStoredCart = () => {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getItemProductId = (item) => {
  if (!item) return null;
  if (typeof item.product === 'object' && item.product !== null) {
    return Number(item.product.id);
  }
  if (item.product !== undefined && item.product !== null) {
    return Number(item.product);
  }
  if (item.product_id !== undefined && item.product_id !== null) {
    return Number(item.product_id);
  }
  return Number(item.id);
};

const calculateLocalTotals = (items, currentCart = {}, storeSettings = null) => {
  const safeItems = Array.isArray(items) ? items : [];
  let regularTotal = 0;
  let itemsTotal = 0;

  const normalizedItems = safeItems.map((item) => {
    const qty = Math.max(0, Number(item.quantity || 0));
    const unitPrice = Number(item.unit_price ?? item.product?.price ?? item.price ?? 0);
    const regularPrice = Number(item.regular_price ?? item.product?.regular_price ?? item.product?.mrp ?? unitPrice);
    const subtotal = (unitPrice * qty).toFixed(2);
    regularTotal += regularPrice * qty;
    itemsTotal += unitPrice * qty;

    return {
      ...item,
      quantity: qty,
      unit_price: unitPrice.toFixed(2),
      regular_price: regularPrice.toFixed(2),
      subtotal,
    };
  });

  const packagingFee = normalizedItems.length > 0
    ? Number(currentCart?.packaging_fee ?? storeSettings?.packaging_fee ?? 0)
    : 0;
  const promoDiscount = Math.min(Number(currentCart?.promo_discount || 0), itemsTotal);
  const total = Math.max(0, itemsTotal - promoDiscount) + packagingFee;
  const discount = Math.max(0, regularTotal - itemsTotal);

  return {
    ...(currentCart || {}),
    items: normalizedItems,
    subtotal: regularTotal.toFixed(2),
    items_total: itemsTotal.toFixed(2),
    discount: discount.toFixed(2),
    packaging_fee: packagingFee.toFixed(2),
    promo_discount: promoDiscount.toFixed(2),
    total: total.toFixed(2),
  };
};

// Module-level cache to track dispatched notifications without hook dependencies
const seenNotificationIds = new Set();
let hasLoadedInitialNotifications = false;

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => getStoredCart())
  const [user, setUser] = useState(getUser)
  const [storeSettings, setStoreSettings] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [notifications, setNotifications] = useState([])
  const cartRef = useRef(cart)
  const storeSettingsRef = useRef(storeSettings)
  const cartMutationQueue = useRef(Promise.resolve())
  const cartMutationVersion = useRef(0)
  const pendingSyncTimers = useRef({})

  useEffect(() => {
    storeSettingsRef.current = storeSettings
  }, [storeSettings])

  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  const replaceCart = useCallback((nextCart) => {
    cartRef.current = nextCart
    setCart(nextCart)
    if (nextCart) {
      try {
        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(nextCart));
      } catch {}
    } else {
      localStorage.removeItem(LOCAL_CART_KEY);
    }
  }, [])

  // Cart mutation responses contain every line item. Serialize writes and only
  // let the newest response replace optimistic state, preventing late responses
  // from undoing a rapid + / - sequence.
  const enqueueCartMutation = useCallback((mutation) => {
    const version = ++cartMutationVersion.current
    const previous = cartMutationQueue.current
    const next = previous.catch(() => undefined).then(() => mutation(version))
    cartMutationQueue.current = next

    void next.finally(() => {
      if (cartMutationQueue.current === next) cartMutationQueue.current = Promise.resolve()
    }).catch(() => undefined)

    return next
  }, [])
 
 const isCustomer = Boolean(user?.is_customer)

  const handleWsMessage = useCallback((msg) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'INITIAL_STATE' || msg.type === 'CART_UPDATED') {
      if (msg.cart && typeof msg.cart === 'object') {
        replaceCart(msg.cart);
      }
    }
  }, [replaceCart]);

  const { isConnected: isWsConnected, sendMessage: sendWsMessage } = useWebSocket({
    path: '/ws/cart/',
    enabled: isCustomer,
    onMessage: handleWsMessage,
    autoReconnect: true,
    heartbeatIntervalMs: 25000,
  });

 const fetchSettings = useCallback(async () => {
   try {
     const response = await api.get('/store/settings/');
     setStoreSettings(response.data);
   } catch (e) { console.error('Failed to load store settings'); }
 }, [])

 const fetchProfile = useCallback(async () => {
   if (!isCustomer) return;
   try {
     const response = await api.get('/auth/profile/');
     localStorage.setItem('smart-kirana-customer-user', JSON.stringify(response.data));
     setUser(response.data);
   } catch (e) { console.error('Failed to load profile'); }
 }, [isCustomer]);

 
  const refreshCart = useCallback(async () => {
    if (!isCustomer) return;
    const refreshVersion = cartMutationVersion.current;
    const res = await api.get('/cart/');
    if (refreshVersion === cartMutationVersion.current) replaceCart(res.data);
  }, [isCustomer, replaceCart])

  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
  });

  const requestWebPushPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        return perm;
      } catch (err) {
        console.error('Failed to request notification permission:', err);
      }
    }
    return 'denied';
  }, []);

  const refreshFavorites = useCallback(async () => {
    if (!isCustomer) return;
    const res = await api.get('/favorites/');
    setFavorites(res.data.results || res.data || []);
  }, [isCustomer])
  
  const refreshNotifications = useCallback(async () => {
    if (!isCustomer) return;
    try {
      const res = await api.get('/notifications/');
      const list = res.data.results || res.data || [];
      setNotifications(list);

      if (!hasLoadedInitialNotifications) {
        list.forEach(n => seenNotificationIds.add(n.id));
        hasLoadedInitialNotifications = true;
      } else {
        list.forEach(n => {
          if (!seenNotificationIds.has(n.id)) {
            seenNotificationIds.add(n.id);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(n.title || 'Narendra Kirana Alert', {
                  body: n.message || '',
                  icon: '/favicon.ico',
                  tag: `nk-${n.id}`
                });
              } catch (e) {
                console.warn('Browser notification error:', e);
              }
            }
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, [isCustomer])

  const refresh = useCallback(async () => {
    if (!isCustomer) {
      const guestCart = getStoredCart();
      if (guestCart) replaceCart(guestCart);
      setFavorites([]);
      setNotifications([]);
      return;
    }
    const stored = getStoredCart();
    const localItems = stored?.items || [];
    if (localItems.length > 0) {
      try {
        const itemsPayload = localItems
          .map(item => ({ product: getItemProductId(item), quantity: item.quantity }))
          .filter(i => i.product && i.quantity > 0);
        if (itemsPayload.length > 0) {
          const res = await api.post('/cart/merge/', { items: itemsPayload });
          if (res?.data) {
            replaceCart(res.data);
          }
        }
      } catch (e) {
        console.warn('Cart merge on refresh warning:', e);
      }
    }
    // Run them independently so one slow request doesn't block the others
    refreshCart().catch(console.error);
    refreshFavorites().catch(console.error);
    refreshNotifications().catch(console.error);
  }, [isCustomer, refreshCart, refreshFavorites, refreshNotifications, replaceCart])

  useEffect(() => { 
     refresh();
     fetchSettings();
     fetchProfile();
     
     // Poll settings every 60s
     const interval = setInterval(() => {
         if (!document.hidden) fetchSettings();
     }, 60000);

     // Poll active notifications every 12s when tab is active
     const notifInterval = setInterval(() => {
         if (!document.hidden && isCustomer) {
           refreshNotifications();
         }
     }, 12000);

     return () => {
       clearInterval(interval);
       clearInterval(notifInterval);
     };
   }, [refresh, fetchSettings, fetchProfile, isCustomer, refreshNotifications])

 const syncUser = useCallback(() => {
   setUser(getUser());
 }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('smart-kirana-customer-refresh');
    
    // Fire and forget backend logout
    if (refresh) {
      api.post('/auth/logout/', { refresh }).catch(() => {});
    }
    
    try {
      await clearAllBrowserCaches();
      localStorage.removeItem('smart-kirana-customer-token');
      localStorage.removeItem('smart-kirana-customer-refresh');
      localStorage.removeItem('smart-kirana-customer-user');
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('smart-kirana-customer') || key.startsWith('sk_cache_') || key.startsWith('sk_ucache_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // Storage restricted or unavailable
    }
    setUser(null);
    replaceCart(null);
    setFavorites([]);
    setNotifications([]);
    seenNotificationIds.clear();
    hasLoadedInitialNotifications = false;
    window.location.href = '/';
  }, [replaceCart]);

  const flushCartSync = useCallback(async () => {
    const timerKeys = Object.keys(pendingSyncTimers.current);
    if (timerKeys.length > 0) {
      timerKeys.forEach(k => {
        clearTimeout(pendingSyncTimers.current[k]);
        delete pendingSyncTimers.current[k];
      });

      if (isCustomer && cartRef.current?.items) {
        try {
          const itemsPayload = cartRef.current.items
            .map(i => ({ product: getItemProductId(i), quantity: i.quantity }))
            .filter(i => i.product && i.quantity > 0);
          if (itemsPayload.length > 0) {
            if (isWsConnected) {
              sendWsMessage({ type: 'MERGE_GUEST', items: itemsPayload });
            } else {
              const res = await api.post('/cart/merge/', { items: itemsPayload });
              if (res?.data) {
                replaceCart(res.data);
              }
            }
          }
        } catch (e) {
          console.warn('Flush cart sync error:', e);
        }
      }
    }
    await cartMutationQueue.current;
  }, [isCustomer, isWsConnected, sendWsMessage, replaceCart]);

  const add = useCallback(async (product, quantity = 1) => {
    if (!product) return;
    const pId = Number(product.id);
    const currentCart = cartRef.current || { items: [] };
    const currentItems = Array.isArray(currentCart.items) ? [...currentCart.items] : [];
    const existingIndex = currentItems.findIndex(i => getItemProductId(i) === pId);

    let nextItems;
    let targetQuantity;

    if (existingIndex > -1) {
      const existing = currentItems[existingIndex];
      const stockLimit = existing.stock_quantity ?? product.stock_quantity ?? 999;
      const maxOrderLimit = existing.max_order_quantity ?? product.max_order_quantity ?? 0;
      const cap = maxOrderLimit > 0 ? Math.min(stockLimit, maxOrderLimit) : stockLimit;
      targetQuantity = Math.min(existing.quantity + quantity, cap);

      nextItems = currentItems.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: targetQuantity } : item
      );
    } else {
      const unitPrice = Number(product.offer_price || product.price || product.regular_price || 0);
      const regularPrice = Number(product.regular_price || product.mrp || unitPrice);
      const stockLimit = product.stock_quantity ?? 999;
      const maxOrderLimit = product.max_order_quantity ?? 0;
      const cap = maxOrderLimit > 0 ? Math.min(stockLimit, maxOrderLimit) : stockLimit;
      targetQuantity = Math.min(quantity, cap);

      const optimisticItem = {
        id: `temp_${pId}_${Date.now()}`,
        product: pId,
        product_name: product.name,
        product_unit: product.unit || 'pack',
        product_image: product.image || product.primary_image || null,
        is_in_stock: product.is_in_stock !== false,
        stock_quantity: product.stock_quantity,
        max_order_quantity: product.max_order_quantity,
        quantity: targetQuantity,
        regular_price: regularPrice.toFixed(2),
        unit_price: unitPrice.toFixed(2),
        subtotal: (unitPrice * targetQuantity).toFixed(2),
      };
      nextItems = [...currentItems, optimisticItem];
    }

    // 1. Instant 0ms Local UI Update!
    const nextCart = calculateLocalTotals(nextItems, currentCart, storeSettingsRef.current);
    replaceCart(nextCart);

    // 2. If guest, cart is saved in local storage. Done!
    if (!isCustomer) return;

    // 3. Debounce background network sync
    if (pendingSyncTimers.current[pId]) {
      clearTimeout(pendingSyncTimers.current[pId]);
      delete pendingSyncTimers.current[pId];
    }

    pendingSyncTimers.current[pId] = setTimeout(async () => {
      delete pendingSyncTimers.current[pId];
      const latestItem = cartRef.current?.items?.find(i => getItemProductId(i) === pId);
      if (!latestItem) return;

      if (isWsConnected) {
        sendWsMessage({
          type: 'UPDATE_QUANTITY',
          item_id: typeof latestItem.id === 'number' && latestItem.id > 0 ? latestItem.id : null,
          product_id: pId,
          quantity: latestItem.quantity,
        });
        return;
      }

      try {
        await enqueueCartMutation(async (version) => {
          let response;
          if (typeof latestItem.id === 'number' && latestItem.id > 0) {
            response = await api.patch(`/cart/items/${latestItem.id}/`, { quantity: latestItem.quantity });
          } else {
            response = await api.post('/cart/items/', { product: pId, quantity: latestItem.quantity });
          }
          if (response?.data && version === cartMutationVersion.current) {
            replaceCart(response.data);
          }
        });
      } catch (err) {
        console.error('Debounced cart add sync failed:', err);
      }
    }, 450);
  }, [isCustomer, isWsConnected, sendWsMessage, enqueueCartMutation, replaceCart]);

  const update = useCallback(async (item, quantity) => {
    if (!item) return;
    const pId = getItemProductId(item);
    const targetQty = Math.max(0, quantity);
    const currentCart = cartRef.current || { items: [] };
    const currentItems = Array.isArray(currentCart.items) ? [...currentCart.items] : [];

    let nextItems;
    if (targetQty <= 0) {
      nextItems = currentItems.filter(i => getItemProductId(i) !== pId && i.id !== item.id);
    } else {
      nextItems = currentItems.map(i => {
        if (getItemProductId(i) === pId || i.id === item.id) {
          return { ...i, quantity: targetQty };
        }
        return i;
      });
    }

    // 1. Instant 0ms Local UI Update!
    const nextCart = calculateLocalTotals(nextItems, currentCart, storeSettingsRef.current);
    replaceCart(nextCart);

    // 2. If guest, done!
    if (!isCustomer) return;

    // 3. Debounce background network sync
    if (pendingSyncTimers.current[pId]) {
      clearTimeout(pendingSyncTimers.current[pId]);
      delete pendingSyncTimers.current[pId];
    }

    pendingSyncTimers.current[pId] = setTimeout(async () => {
      delete pendingSyncTimers.current[pId];
      if (isWsConnected) {
        if (targetQty <= 0) {
          sendWsMessage({
            type: 'REMOVE_ITEM',
            item_id: typeof item.id === 'number' && item.id > 0 ? item.id : null,
            product_id: pId,
          });
        } else {
          sendWsMessage({
            type: 'UPDATE_QUANTITY',
            item_id: typeof item.id === 'number' && item.id > 0 ? item.id : null,
            product_id: pId,
            quantity: targetQty,
          });
        }
        return;
      }

      try {
        await enqueueCartMutation(async (version) => {
          let response;
          if (targetQty <= 0) {
            if (typeof item.id === 'number' && item.id > 0) {
              response = await api.delete(`/cart/items/${item.id}/`);
            } else {
              return;
            }
          } else {
            const realItem = cartRef.current?.items?.find(i => getItemProductId(i) === pId && typeof i.id === 'number' && i.id > 0);
            const targetId = realItem?.id || (typeof item.id === 'number' && item.id > 0 ? item.id : null);
            if (targetId) {
              response = await api.patch(`/cart/items/${targetId}/`, { quantity: targetQty });
            } else {
              response = await api.post('/cart/items/', { product: pId, quantity: targetQty });
            }
          }
          if (response?.data && version === cartMutationVersion.current) {
            replaceCart(response.data);
          }
        });
      } catch (err) {
        console.error('Debounced cart update sync failed:', err);
      }
    }, 450);
  }, [isCustomer, isWsConnected, sendWsMessage, enqueueCartMutation, replaceCart]);

  const clearCart = useCallback(async () => {
    Object.keys(pendingSyncTimers.current).forEach(k => {
      clearTimeout(pendingSyncTimers.current[k]);
      delete pendingSyncTimers.current[k];
    });
    const emptyCart = {
      items: [],
      subtotal: '0.00',
      items_total: '0.00',
      discount: '0.00',
      promo_code: null,
      promo_discount: '0.00',
      packaging_fee: '0.00',
      total: '0.00'
    };
    replaceCart(emptyCart);

    if (!isCustomer) return;
    if (isWsConnected) {
      sendWsMessage({ type: 'CLEAR_CART' });
      return;
    }
    try {
      await enqueueCartMutation(async (version) => {
        const response = await api.post('/cart/clear/');
        if (version === cartMutationVersion.current) replaceCart(response.data);
      });
    } catch {
      // ignore
    }
  }, [isCustomer, isWsConnected, sendWsMessage, enqueueCartMutation, replaceCart]);

  const applyPromo = useCallback(async (code) => {
    await flushCartSync();
    await enqueueCartMutation(async (version) => {
      const response = await api.post('/cart/apply-promo/', { code });
      if (version === cartMutationVersion.current) replaceCart(response.data);
    });
  }, [flushCartSync, enqueueCartMutation, replaceCart]);

  const toggleFavorite = useCallback(async (productId) => {
    if (!isCustomer) return;
    const numId = Number(productId);
    const isFav = favorites.find(f => 
      Number(f.product) === numId || 
      Number(f.product?.id) === numId || 
      Number(f.product_details?.id) === numId
    );
    try {
      if (isFav?.id) {
        await api.delete(`/favorites/${isFav.id}/`).catch(() =>
          api.post('/favorites/toggle/', { product: numId })
        );
      } else {
        await api.post('/favorites/', { product: numId });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
    refreshFavorites().catch(console.error);
  }, [isCustomer, favorites, refreshFavorites])

 // Memoize the context value to prevent unnecessary re-renders of all consumers
 const value = useMemo(() => ({
   cart, add, update, clearCart, refresh, user, isCustomer, syncUser, logout,
   applyPromo, storeSettings, favorites, toggleFavorite, notifications,
   notificationPermission, requestWebPushPermission, flushCartSync, isWsConnected
 }), [cart, add, update, clearCart, refresh, user, isCustomer, syncUser, logout,
      applyPromo, storeSettings, favorites, toggleFavorite, notifications,
      notificationPermission, requestWebPushPermission, flushCartSync, isWsConnected])

 return (
   <CartContext.Provider value={value}>
     {children}
   </CartContext.Provider>
 )
}

export default CartProvider;
