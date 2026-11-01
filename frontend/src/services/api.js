import axios from 'axios';

export const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api/v1';
  }
  return 'https://narendra-kirana.onrender.com/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

const getPrefix = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('delivery')) return 'smart-kirana-delivery';
    if (window.location.hostname.includes('owner') || window.location.hostname.includes('admin')) return 'smart-kirana-owner';
    if (window.location.pathname.startsWith('/owner')) return 'smart-kirana-owner';
    if (window.location.pathname.startsWith('/delivery')) return 'smart-kirana-delivery';
  }
  return 'smart-kirana-customer';
};

const isAuthEndpoint = (url = '') => {
  const cleanUrl = url.toLowerCase();
  return (
    cleanUrl.includes('auth/login') ||
    cleanUrl.includes('auth/google-login') ||
    cleanUrl.includes('auth/admin-google-login') ||
    cleanUrl.includes('auth/token/refresh') ||
    cleanUrl.includes('auth/signup') ||
    cleanUrl.includes('auth/password-reset')
  );
};

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const prefix = getPrefix();
    const token = localStorage.getItem(`${prefix}-token`);
    config.headers = config.headers || {};
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    if (prefix === 'smart-kirana-owner') {
      config.headers['X-Portal-Context'] = 'owner';
    } else if (prefix === 'smart-kirana-delivery') {
      config.headers['X-Portal-Context'] = 'delivery';
    } else {
      config.headers['X-Portal-Context'] = 'customer';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Concurrency queue for handling 401s without duplicate refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase();
    const url = response.config?.url || '';
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      if (url.includes('store/settings')) {
        invalidateCache('/store/settings/');
      } else if (url.includes('products')) {
        invalidateCache('/products/');
      } else if (url.includes('categories')) {
        invalidateCache('/categories/');
      } else if (url.includes('offers')) {
        invalidateCache('/offers/');
      } else if (url.includes('homepage-sections')) {
        invalidateCache('/store/homepage-sections/');
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error?.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Auto-retry cold start timeouts (Render spins down after 15m), transient network errors, and 502/503/504 gateway errors
    const isTimeout =
      error?.code === 'ECONNABORTED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.message?.toLowerCase().includes('timeout');

    const isNetworkError =
      error?.code === 'ERR_NETWORK' ||
      error?.message?.toLowerCase().includes('network') ||
      (!error?.response && Boolean(error?.request));

    const is5xxGatewayError = Boolean(
      error?.response?.status && [502, 503, 504].includes(error.response.status)
    );

    const isColdStartOrTransient = isTimeout || isNetworkError || is5xxGatewayError;

    if (isColdStartOrTransient) {
      const method = (originalRequest.method || 'get').toLowerCase();
      const isSafeMethod = ['get', 'head', 'options'].includes(method);
      const RETRY_DELAYS = [2000, 4000, 8000, 14000, 20000, 24000];
      const maxRetries = RETRY_DELAYS.length;

      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      if (isSafeMethod && originalRequest._retryCount <= maxRetries) {
        const delayMs = RETRY_DELAYS[originalRequest._retryCount - 1] || 20000;
        console.log(
          `[Api] Backend waking up or transient network hiccup. Retrying ${originalRequest.url} (attempt ${originalRequest._retryCount}/${maxRetries}) in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return api(originalRequest);
      }
    }

    if (!error.response) {
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      const requestUrl = originalRequest.url || '';
      
      // If error is from an auth endpoint, do not attempt refresh
      if (isAuthEndpoint(requestUrl)) {
        return Promise.reject(error);
      }

      const prefix = getPrefix();

      // If already retried, prevent infinite loop
      if (originalRequest._retry) {
        localStorage.removeItem(`${prefix}-token`);
        localStorage.removeItem(`${prefix}-refresh`);
        localStorage.removeItem(`${prefix}-user`);
        if (prefix === 'smart-kirana-owner') {
          window.location.href = (window.location.hostname.includes('owner') || window.location.hostname.includes('admin')) ? '/login' : '/owner/login';
        } else if (prefix === 'smart-kirana-delivery') {
          window.location.href = window.location.hostname.includes('delivery') ? '/login' : 'https://narendra-kirana-delivery.vercel.app/login';
        }
        return Promise.reject(error);
      }

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(`${prefix}-refresh`);
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        localStorage.removeItem(`${prefix}-token`);
        localStorage.removeItem(`${prefix}-refresh`);
        localStorage.removeItem(`${prefix}-user`);
        if (prefix === 'smart-kirana-owner') {
          window.location.href = (window.location.hostname.includes('owner') || window.location.hostname.includes('admin')) ? '/login' : '/owner/login';
        } else if (prefix === 'smart-kirana-delivery') {
          window.location.href = window.location.hostname.includes('delivery') ? '/login' : 'https://narendra-kirana-delivery.vercel.app/login';
        }
        return Promise.reject(error);
      }

      try {
        const baseURL = api.defaults.baseURL || 'https://narendra-kirana.onrender.com/api/v1';
        // Use raw axios to bypass interceptor
        const response = await axios.post(`${baseURL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data?.access;
        const newRefreshToken = response.data?.refresh;

        if (newAccessToken) {
          localStorage.setItem(`${prefix}-token`, newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem(`${prefix}-refresh`, newRefreshToken);
          }

          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return api(originalRequest);
        } else {
          throw new Error('No access token returned from refresh');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem(`${prefix}-token`);
        localStorage.removeItem(`${prefix}-refresh`);
        localStorage.removeItem(`${prefix}-user`);
        clearUserCache();
        clearAllBrowserCaches().catch(() => {});
        if (prefix === 'smart-kirana-owner') {
          window.location.href = '/owner/login';
        } else if (prefix === 'smart-kirana-delivery') {
          window.location.href = window.location.hostname.includes('delivery') ? '/login' : 'https://narendra-kirana-delivery.vercel.app/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);



// Advanced Persistent Cache (Stale-While-Revalidate)
// FIXED: Removed /notifications/ and /favorites/ — these are user-specific and must NOT be cached across users
const memoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 20; // Prevent localStorage quota exhaustion
const CACHEABLE_URLS = [
  '/products/', 
  '/categories/', 
  '/offers/banners/', 
  '/store/settings/', 
  '/store/homepage-sections/',
];

// Evict oldest cache entries only when limit is actually exceeded
function evictOldestCache() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (localStorage.length <= MAX_CACHE_ENTRIES) return;

  const cacheKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sk_cache_')) {
      cacheKeys.push(key);
    }
  }

  if (cacheKeys.length > MAX_CACHE_ENTRIES) {
    const keyWithTime = [];
    for (const key of cacheKeys) {
      try {
        const val = JSON.parse(localStorage.getItem(key));
        keyWithTime.push({ key, timestamp: val?.timestamp || 0 });
      } catch (e) {
        keyWithTime.push({ key, timestamp: 0 });
      }
    }
    keyWithTime.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = keyWithTime.slice(0, keyWithTime.length - MAX_CACHE_ENTRIES);
    toRemove.forEach(entry => localStorage.removeItem(entry.key));
  }
}

export function invalidateCache(urlPrefix = '') {
  for (const key of memoryCache.keys()) {
    if (!urlPrefix || key.includes(urlPrefix)) {
      memoryCache.delete(key);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sk_cache_')) {
          if (!urlPrefix || key.includes(urlPrefix)) {
            toRemove.push(key);
          }
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
  }
}

const inFlightMap = new Map();

const originalGet = api.get;
api.get = async (url, config = {}) => {
  const safeUrl = url || '';
  const isOwnerRoute = window.location.pathname.startsWith('/owner');
  const hasSearchParams = config?.params?.search || config?.params?.t; // Don't cache search queries or cache-busted requests
  const isCacheable = !isOwnerRoute && !hasSearchParams && CACHEABLE_URLS.some(u => safeUrl.startsWith(u));

  let queryString = '';
  if (config && config.params && Object.keys(config.params).length > 0) {
    queryString = '?' + new URLSearchParams(config.params).toString();
  }
  const flightKey = safeUrl + queryString;

  if (!isCacheable) {
    if (inFlightMap.has(flightKey)) {
      return inFlightMap.get(flightKey);
    }
    const p = originalGet.call(api, url, config).finally(() => inFlightMap.delete(flightKey));
    inFlightMap.set(flightKey, p);
    return p;
  }

  const cacheKey = 'sk_cache_' + safeUrl + queryString;
  let cachedData = memoryCache.get(cacheKey);

  // 1. If not in memory, check LocalStorage (happens on every page reload)
  if (!cachedData) {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        cachedData = JSON.parse(stored);
        memoryCache.set(cacheKey, cachedData);
      }
    } catch (e) { /* ignore corrupt cache entries */ }
  }

  // 2. If we found data (either in memory or LocalStorage), return it INSTANTLY
  if (cachedData) {
    const isStale = Date.now() - cachedData.timestamp > CACHE_TTL;
    
    // 3. If the data is old (stale), silently fetch fresh data in the background (deduplicated)
    if (isStale && !inFlightMap.has(flightKey)) {
      const bgPromise = originalGet.call(api, url, config)
        .then(response => {
          if (response && response.status === 200) {
            const newData = { data: response.data, timestamp: Date.now() };
            memoryCache.set(cacheKey, newData);
            try { evictOldestCache(); localStorage.setItem(cacheKey, JSON.stringify(newData)); } catch(e) {}
          }
        })
        .catch(() => { /* Ignore background errors, user still sees cached data */ })
        .finally(() => {
          inFlightMap.delete(flightKey);
        });
      inFlightMap.set(flightKey, bgPromise);
    }
    
    // Return cached data instantly (0-second wait)
    return Promise.resolve({ 
      data: cachedData.data, 
      status: 200, 
      statusText: 'OK', 
      headers: {}, 
      config: config, 
      fromCache: true 
    });
  }

  // 4. If absolutely no cache exists (very first time visiting the site ever), deduplicate in-flight
  if (inFlightMap.has(flightKey)) {
    return inFlightMap.get(flightKey);
  }

  const fetchPromise = (async () => {
    try {
      const response = await originalGet.call(api, url, config);
      if (response && response.status === 200) {
        const newData = { data: response.data, timestamp: Date.now() };
        memoryCache.set(cacheKey, newData);
        try { evictOldestCache(); localStorage.setItem(cacheKey, JSON.stringify(newData)); } catch(e) {}
      }
      return response;
    } finally {
      inFlightMap.delete(flightKey);
    }
  })();

  inFlightMap.set(flightKey, fetchPromise);
  return fetchPromise;
};

export const readCacheSync = (url, config = {}) => {
  const safeUrl = url || '';
  let queryString = '';
  if (config && config.params && Object.keys(config.params).length > 0) {
    queryString = '?' + new URLSearchParams(config.params).toString();
  }
  const cacheKey = 'sk_cache_' + safeUrl + queryString;
  let cachedData = memoryCache.get(cacheKey);
  if (!cachedData) {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) cachedData = JSON.parse(stored);
    } catch (e) { /* ignore */ }
  }
  return cachedData ? cachedData.data : null;
};

// User-Scoped Cache for Customer Profile Sections (Wallet, Orders, Addresses, Notifications, Referrals)
const userMemoryCache = new Map();

function getActiveUserId() {
  try {
    const userStr = localStorage.getItem('smart-kirana-customer-user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.id) return String(user.id);
    }
  } catch {}
  return null;
}

export const getUserCacheSync = (url, config = {}) => {
  const userId = getActiveUserId();
  if (!userId) return null;
  const safeUrl = url || '';
  let queryString = '';
  if (config && config.params && Object.keys(config.params).length > 0) {
    queryString = '?' + new URLSearchParams(config.params).toString();
  }
  const cacheKey = `sk_ucache_${userId}_${safeUrl}${queryString}`;
  let cachedData = userMemoryCache.get(cacheKey);
  if (!cachedData) {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - (parsed.timestamp || 0) < 15 * 60 * 1000) {
          cachedData = parsed;
          userMemoryCache.set(cacheKey, parsed);
        }
      }
    } catch (e) {}
  }
  return cachedData ? cachedData.data : null;
};

export const setUserCache = (url, data, config = {}) => {
  const userId = getActiveUserId();
  if (!userId || data === undefined) return;
  const safeUrl = url || '';
  let queryString = '';
  if (config && config.params && Object.keys(config.params).length > 0) {
    queryString = '?' + new URLSearchParams(config.params).toString();
  }
  const cacheKey = `sk_ucache_${userId}_${safeUrl}${queryString}`;
  const payload = { data, timestamp: Date.now() };
  userMemoryCache.set(cacheKey, payload);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch (e) {}
};

export const clearUserCache = () => {
  userMemoryCache.clear();
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sk_ucache_')) {
        toRemove.push(k);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {}
};

export const clearAllBrowserCaches = async () => {
  // 1. Invalidate in-memory & localStorage API caches
  try {
    invalidateCache();
    clearUserCache();
  } catch {}

  // 2. Clear browser Cache Storage API (PWA, Service Worker caches)
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map(k => caches.delete(k)));
    } catch {}
  }

  // 3. Clear session storage
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.clear();
    } catch {}
  }
};

export default api;

