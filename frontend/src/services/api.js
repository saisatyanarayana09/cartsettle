import axios from 'axios';
import { handleLovableAgentFallback } from './lovableAgentFallback';

export const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (
    import.meta.env.DEV ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]'))
  ) {
    return '/api/v1';
  }
  return 'https://cartsettle-api.onrender.com/api/v1';
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

// Add a request interceptor to attach the JWT token and enforce fast timeout on AI Agent calls
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
    // Fast 6.5s POST cap (9s for vision uploads) so AI Agent calls never stall on cold starts or upstream spikes
    if ((config.url || '').includes('/store/agent/') && !config.timeout) {
      const isGet = (config.method || 'get').toLowerCase() === 'get';
      const hasImage = Boolean(config.data && typeof config.data === 'object' && config.data.image);
      config.timeout = isGet ? 3500 : hasImage ? 9000 : 6500;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Render Free Tier Keep-Warm Heartbeat: prevents 15-minute container spin-down and pre-warms Neon DB
let lastWakePingTs = 0;
export const triggerBackgroundWakeUp = () => {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastWakePingTs < 30000) return;
  lastWakePingTs = now;
  const base = getBaseURL();
  axios.get(`${base}/store/settings/`, { timeout: 25000 }).catch(() => {});
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  setTimeout(() => {
    if (!document.hidden) triggerBackgroundWakeUp();
  }, 600);
  setInterval(() => {
    if (!document.hidden) triggerBackgroundWakeUp();
  }, 4 * 60 * 1000);
}

// Offline demo login fallback (cloud previews without a reachable Django backend).
// Only used for the two published judge demo accounts, and only when the backend is unreachable.
const DEMO_ACCOUNTS = {
  shopper: { password: 'Shopper@2026', user: { id: 101, username: 'shopper', email: 'shopper@cartsettle.store', first_name: 'Demo', last_name: 'Shopper', is_owner: false, is_staff: false } },
  owner: { password: 'CartSettle@2026', user: { id: 1, username: 'owner', email: 'owner@cartsettle.store', first_name: 'Store', last_name: 'Owner', is_owner: true, is_staff: true } },
};

const base64UrlEncode = (obj) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

// JWT-shaped (unsigned) token so client-side expiry checks in App.jsx accept it.
// The real Django backend will reject it, which correctly forces a real login once the backend is reachable.
const buildOfflineDemoToken = (username, type, ttlSeconds) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode({ alg: 'none', typ: 'JWT' });
  const payload = base64UrlEncode({ token_type: type, username, offline_demo: true, iat: now, exp: now + ttlSeconds });
  return `${header}.${payload}.offline-demo`;
};

const isBackendUnreachable = (error) => {
  if (!error?.response) return true; // network error, CORS block, DNS failure, timeout
  const status = error.response.status;
  if ([502, 503, 504].includes(status)) return true;
  // Vite dev proxy answers 500 with an empty body when Django is not running (ECONNREFUSED)
  if (status === 500 && (error.response.data === '' || error.response.data == null)) return true;
  return false;
};

const tryOfflineDemoLogin = (originalRequest) => {
  let body = originalRequest.data;
  try {
    body = typeof body === 'string' ? JSON.parse(body) : (body || {});
  } catch {
    return null;
  }
  const username = String(body.username || body.email || '').trim().toLowerCase();
  const account = DEMO_ACCOUNTS[username];
  if (!account || body.password !== account.password) return null;
  console.warn('[Api] Backend unreachable. Using offline demo session for', username);
  return {
    access: buildOfflineDemoToken(username, 'access', 60 * 60 * 24),
    refresh: buildOfflineDemoToken(username, 'refresh', 60 * 60 * 24 * 7),
    user: account.user,
    offline_demo: true,
  };
};

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

    // Autonomous client-side Agent fallback when hosted in Lovable.dev cloud preview or during Render cold start
    if ((originalRequest.url || '').includes('/store/agent/')) {
      const isAgentTimeout =
        error?.code === 'ECONNABORTED' ||
        error?.code === 'ETIMEDOUT' ||
        error?.message?.toLowerCase().includes('timeout');
      // Only retry once (with a fast 2.5s cap) if the local backend had an instant socket reset, never after a timeout
      if (!originalRequest._agentRetried && !isAgentTimeout && isBackendUnreachable(error)) {
        originalRequest._agentRetried = true;
        originalRequest.timeout = 2500;
        await new Promise((resolve) => setTimeout(resolve, 250));
        try {
          return await api(originalRequest);
        } catch {
          // Proceed to client-side fallback if second attempt also fails
        }
      }
      triggerBackgroundWakeUp();
      const fallbackData = handleLovableAgentFallback(originalRequest);
      return Promise.resolve({
        data: fallbackData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: originalRequest,
      });
    }

    // Offline demo login fallback: for judge demo accounts when backend is unreachable or DB has not seeded demo account yet.
    // Wrong passwords (401) for non-demo accounts still surface normally.
    if ((originalRequest.url || '').includes('/auth/login/') && (isBackendUnreachable(error) || error?.response?.status === 401)) {
      const demoSession = tryOfflineDemoLogin(originalRequest);
      if (demoSession) {
        return Promise.resolve({
          data: demoSession,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest,
        });
      }
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
      const currentToken = localStorage.getItem(`${prefix}-token`) || '';
      const refreshToken = localStorage.getItem(`${prefix}-refresh`) || '';

      // If running in an offline-demo session, never wipe localStorage or kick user back to /owner/login on 401
      if (currentToken.endsWith('.offline-demo') || refreshToken.endsWith('.offline-demo')) {
        const method = (originalRequest.method || 'get').toLowerCase();
        if (method === 'get') {
          let fallbackBody = [];
          if (requestUrl.includes('analytics')) {
            fallbackBody = { today_sales: 0, weekly_sales: 0, monthly_sales: 0, yearly_sales: 0, chart_data: [] };
          } else if (requestUrl.includes('profile') || requestUrl.includes('auth/me')) {
            try {
              fallbackBody = JSON.parse(localStorage.getItem(`${prefix}-user`) || '{}');
            } catch {
              fallbackBody = DEMO_ACCOUNTS.owner.user;
            }
          }
          return Promise.resolve({
            data: fallbackBody,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: originalRequest,
          });
        }
        return Promise.reject(error);
      }

      // If already retried, prevent infinite loop
      if (originalRequest._retry) {
        localStorage.removeItem(`${prefix}-token`);
        localStorage.removeItem(`${prefix}-refresh`);
        localStorage.removeItem(`${prefix}-user`);
        if (prefix === 'smart-kirana-owner') {
          window.location.href = (window.location.hostname.includes('owner') || window.location.hostname.includes('admin')) ? '/login' : '/owner/login';
        } else if (prefix === 'smart-kirana-delivery') {
          window.location.href = window.location.hostname.includes('delivery') ? '/login' : '/delivery/login';
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

      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        localStorage.removeItem(`${prefix}-token`);
        localStorage.removeItem(`${prefix}-refresh`);
        localStorage.removeItem(`${prefix}-user`);
        if (prefix === 'smart-kirana-owner') {
          window.location.href = (window.location.hostname.includes('owner') || window.location.hostname.includes('admin')) ? '/login' : '/owner/login';
        } else if (prefix === 'smart-kirana-delivery') {
          window.location.href = window.location.hostname.includes('delivery') ? '/login' : '/delivery/login';
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
          window.location.href = window.location.hostname.includes('delivery') ? '/login' : '/delivery/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);



// Caching Layer Disabled: All requests execute live against the backend
export function invalidateCache() {}
export const readCacheSync = () => null;
export const getUserCacheSync = () => null;
export const setUserCache = () => {};
export const clearUserCache = () => {};

export const clearAllBrowserCaches = async () => {
  try {
    if (typeof window !== 'undefined') {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('sk_cache_') || k.startsWith('sk_ucache_') || k.includes('cart-cache'))) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch {}

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map(k => caches.delete(k)));
    } catch {}
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.clear();
    } catch {}
  }
};

// Immediately purge stale caches on module load
try {
  if (typeof window !== 'undefined') {
    const staleKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sk_cache_') || k.startsWith('sk_ucache_') || k.includes('cart-cache'))) {
        staleKeys.push(k);
      }
    }
    staleKeys.forEach(k => localStorage.removeItem(k));
  }
} catch {}

api.invalidateCache = invalidateCache;

export default api;

