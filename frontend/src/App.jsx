import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import { CartProvider } from './CartProvider.jsx';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { SmartAppBanner } from './components/SmartAppBanner';

const DEFAULT_GOOGLE_CLIENT_ID = '729937153109-6e8fivp20b3ri2qsah1d6u2a7oi0uls6.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

const VerifyEmail = lazyWithRetry(() => import('./VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const ForgotPassword = lazyWithRetry(() => import('./ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazyWithRetry(() => import('./ResetPassword').then(m => ({ default: m.ResetPassword })));

const HomePage = lazyWithRetry(() => import('./customer').then(m => ({ default: m?.HomePage || (() => null) })));
const ProductDetailPage = lazyWithRetry(() => import('./customer').then(m => ({ default: m?.ProductDetailPage || (() => null) })));
const ProductsPage = lazyWithRetry(() => import('./customer').then(m => ({ default: m?.ProductsPage || (() => null) })));
const CategoriesPage = lazyWithRetry(() => import('./customer').then(m => ({ default: m?.CategoriesPage || (() => null) })));

const CartPage = lazyWithRetry(() => import('./pages/cart/CartPage'));
const CheckoutPage = lazyWithRetry(() => import('./pages/cart/CheckoutPage'));
const CustomerLoginPage = lazyWithRetry(() => import('./pages/auth/LoginPage'));
const CustomerSignupPage = lazyWithRetry(() => import('./pages/auth/SignupPage'));
const OrderDetailPage = lazyWithRetry(() => import('./pages/order/OrderDetailPage'));
const CustomerLayout = lazyWithRetry(() => import('./customer-layout'));

const ProfileLayout = lazyWithRetry(() => import('./profile/layouts/ProfileLayout'));
const DashboardHome = lazyWithRetry(() => import('./profile/pages/DashboardHome'));
const AccountSettings = lazyWithRetry(() => import('./profile/pages/AccountSettings'));
const OrdersHistory = lazyWithRetry(() => import('./profile/pages/OrdersHistory'));
const SavedAddresses = lazyWithRetry(() => import('./profile/pages/SavedAddresses'));
const Favorites = lazyWithRetry(() => import('./profile/pages/Favorites'));
const Notifications = lazyWithRetry(() => import('./profile/pages/Notifications'));
const CustomerFeedback = lazyWithRetry(() => import('./profile/pages/Feedback'));
const HelpCenter = lazyWithRetry(() => import('./profile/pages/HelpCenter'));
const Wallet = lazyWithRetry(() => import('./profile/pages/Wallet'));
const ReferAndEarn = lazyWithRetry(() => import('./profile/pages/ReferAndEarn'));
const AppSettings = lazyWithRetry(() => import('./profile/pages/AppSettings'));
const OffersPromoCodes = lazyWithRetry(() => import('./profile/pages/OffersPromoCodes'));
const LanguageSettings = lazyWithRetry(() => import('./profile/pages/LanguageSettings'));

const OwnerLayout = lazyWithRetry(() => import('./owner/layouts/OwnerLayout'));
const OwnerLogin = lazyWithRetry(() => import('./owner/pages/Login'));
const OwnerForgotPassword = lazyWithRetry(() => import('./owner/pages/ForgotPassword'));
const OwnerResetPassword = lazyWithRetry(() => import('./owner/pages/ResetPassword'));
const Welcome = lazyWithRetry(() => import('./owner/pages/Welcome'));
const Dashboard = lazyWithRetry(() => import('./owner/pages/Dashboard'));
const Sales = lazyWithRetry(() => import('./owner/pages/Sales'));
const Categories = lazyWithRetry(() => import('./owner/pages/Categories'));
const Products = lazyWithRetry(() => import('./owner/pages/Products'));
const Orders = lazyWithRetry(() => import('./owner/pages/Orders'));
const OrderDetails = lazyWithRetry(() => import('./owner/pages/OrderDetails'));
const Invoice = lazyWithRetry(() => import('./owner/pages/Invoice'));
const Invoices = lazyWithRetry(() => import('./owner/pages/Invoices'));
const Offers = lazyWithRetry(() => import('./owner/pages/Offers'));
const Referrals = lazyWithRetry(() => import('./owner/pages/Referrals'));
const Customers = lazyWithRetry(() => import('./owner/pages/Customers'));
const Feedback = lazyWithRetry(() => import('./owner/pages/Feedback'));
const Settings = lazyWithRetry(() => import('./owner/pages/Settings'));
const AdvancedSettings = lazyWithRetry(() => import('./owner/pages/AdvancedSettings'));
const Showcase = lazyWithRetry(() => import('./owner/pages/Showcase'));
const DeliveryPartners = lazyWithRetry(() => import('./owner/pages/DeliveryPartners'));
const NotificationsBroadcast = lazyWithRetry(() => import('./owner/pages/NotificationsBroadcast'));

const DeliveryLogin = lazyWithRetry(() => import('./delivery/DeliveryLogin'));
const DeliveryGuard = lazyWithRetry(() => import('./delivery/DeliveryGuard'));
const DeliveryLayout = lazyWithRetry(() => import('./delivery/DeliveryLayout'));
const DeliveryDashboard = lazyWithRetry(() => import('./delivery/DeliveryDashboard'));
const DeliveryHistory = lazyWithRetry(() => import('./delivery/DeliveryHistory'));
const DeliveryProfile = lazyWithRetry(() => import('./delivery/DeliveryProfile'));
const DownloadPage = lazyWithRetry(() => import('./DownloadPage'));


const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

const getValidAuthToken = (prefix) => {
  const token = localStorage.getItem(`${prefix}-token`);
  const refresh = localStorage.getItem(`${prefix}-refresh`);

  if (!token && !refresh) {
    return null;
  }

  // If access token is still unexpired, user is validly authenticated
  if (token && !isTokenExpired(token)) {
    return token;
  }

  // If access token expired but refresh token exists and is not expired,
  // the axios interceptor can refresh the session seamlessly.
  if (refresh && !isTokenExpired(refresh)) {
    return refresh;
  }

  // Both access and refresh are expired or invalid -> purge stale credentials
  localStorage.removeItem(`${prefix}-token`);
  localStorage.removeItem(`${prefix}-refresh`);
  localStorage.removeItem(`${prefix}-user`);
  localStorage.removeItem(`${prefix}-username`);
  return null;
};

const ownerToken = () => getValidAuthToken('smart-kirana-owner');
const customerToken = () => getValidAuthToken('smart-kirana-customer');

function Guard({ children, isOwnerDomain = false }) {
  const location = useLocation();
  // Bypass auth check when running under Cypress tests
  if (typeof window !== 'undefined' && window.Cypress) {
    return children;
  }
  const loginPath = isOwnerDomain ? "/login" : "/owner/login";
  return ownerToken() ? children : <Navigate to={loginPath} state={{ from: location }} replace />;
}

function CustomerGuard({ children }) {
  const location = useLocation();
  if (typeof window !== 'undefined' && window.Cypress) {
    return children;
  }
  if (!customerToken()) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} state={{ from: location }} replace />;
  }
  return children;
}

function CustomerApp() {
 return (
   <>
     <SmartAppBanner />
     <OfflineBanner />
     <CartProvider>
       <Outlet />
     </CartProvider>
   </>
 );
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /failed to fetch dynamically imported module/i.test(error?.message || '') ||
      /loading chunk .* failed/i.test(error?.message || '') ||
      /error loading dynamically imported module/i.test(error?.message || '');

    if (isChunkError) {
      const ebCount = Number(sessionStorage.getItem('eb_chunk_reload_count') || 0);
      if (ebCount < 1) {
        sessionStorage.setItem('eb_chunk_reload_count', '1');
        window.location.reload();
        return;
      }
      console.warn('ErrorBoundary: Max reload attempt reached. Displaying recovery UI.');
    }
  }

  handleHardReload = async () => {
    try {
      sessionStorage.removeItem('eb_chunk_reload_count');
      sessionStorage.removeItem('lazy_chunk_retry_count');
      sessionStorage.removeItem('vite_preload_reload_count');
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.warn('Error clearing caches on reload:', e);
    }
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.href = cleanUrl + '?ts=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        /failed to fetch dynamically imported module/i.test(this.state.error?.message || '') ||
        /loading chunk .* failed/i.test(this.state.error?.message || '') ||
        /error loading dynamically imported module/i.test(this.state.error?.message || '');

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
              {isChunkError ? '🔄' : '⚠️'}
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              {isChunkError ? 'New Update Available!' : 'Oops, something went wrong'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {isChunkError
                ? 'We just updated Narendra Kirana with new improvements. Please reload to apply the latest version.'
                : 'An unexpected error occurred. Please reload the page to continue shopping.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleHardReload}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                Reload Narendra Kirana
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
              >
                Go to Homepage
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 cursor-pointer">
                <summary className="font-semibold text-slate-500 dark:text-slate-400 mb-1">Technical Details</summary>
                <p className="font-mono break-all text-[11px]">{this.state.error.toString()}</p>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}



function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-rose-600 text-white p-2 text-center text-sm font-bold flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      You are offline. Please check your internet connection.
    </div>
  );
}

function OwnerExternalRedirect() {
  const location = useLocation();
  useEffect(() => {
    const subPath = location.pathname.replace(/^\/owner\/?/, '/') || '/';
    const target = `https://narendra-kirana-owner.vercel.app${subPath}${location.search}${location.hash}`;
    window.location.replace(target);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans p-6 text-center">
      <div className="size-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
      <h2 className="text-lg font-black text-white">Redirecting to Owner Portal...</h2>
      <p className="text-xs text-slate-400 mt-1">Taking you to https://narendra-kirana-owner.vercel.app</p>
    </div>
  );
}

function DeliveryExternalRedirect() {
  const location = useLocation();
  useEffect(() => {
    const subPath = location.pathname.replace(/^\/delivery\/?/, '/') || '/';
    const target = `https://narendra-kirana-delivery.vercel.app${subPath}${location.search}${location.hash}`;
    window.location.replace(target);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans p-6 text-center">
      <div className="size-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
      <h2 className="text-lg font-black text-white">Redirecting to Delivery Portal...</h2>
      <p className="text-xs text-slate-400 mt-1">Taking you to https://narendra-kirana-delivery.vercel.app</p>
    </div>
  );
}

function App() {
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.endsWith('.local')
  );
  const isDeliveryDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('delivery') ||
    window.location.hostname.startsWith('delivery.')
  );

  const isDownloadDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('download') ||
    window.location.hostname.startsWith('download.')
  );

  const isOwnerDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('owner') ||
    window.location.hostname.includes('admin') ||
    window.location.hostname.startsWith('owner.') ||
    window.location.hostname.startsWith('admin.')
  );

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ErrorBoundary>
        <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Toaster position="top-center" toastOptions={{ style: { borderRadius: '12px', background: '#333', color: '#fff' } }} />
            <Suspense fallback={null}>
              {isOwnerDomain ? (
                <Routes>
                  <Route path="/login" element={<OwnerLogin />} />
                  <Route path="/owner/login" element={<OwnerLogin />} />
                  <Route path="/forgot-password" element={<OwnerForgotPassword />} />
                  <Route path="/owner/forgot-password" element={<OwnerForgotPassword />} />
                  <Route path="/reset-password" element={<OwnerResetPassword />} />
                  <Route path="/owner/reset-password" element={<OwnerResetPassword />} />
                  <Route path="/welcome" element={<Guard isOwnerDomain><Welcome /></Guard>} />
                  <Route path="/owner/welcome" element={<Guard isOwnerDomain><Welcome /></Guard>} />

                  <Route element={<Guard isOwnerDomain><OwnerLayout /></Guard>}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/owner" element={<Dashboard />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/owner/sales" element={<Sales />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/owner/categories" element={<Categories />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/owner/products" element={<Products />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/owner/orders" element={<Orders />} />
                    <Route path="/orders/:id" element={<OrderDetails />} />
                    <Route path="/owner/orders/:id" element={<OrderDetails />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/owner/invoices" element={<Invoices />} />
                    <Route path="/offers" element={<Offers />} />
                    <Route path="/owner/offers" element={<Offers />} />
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/owner/referrals" element={<Referrals />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/owner/customers" element={<Customers />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/owner/feedback" element={<Feedback />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/owner/settings" element={<Settings />} />
                    <Route path="/advanced-settings" element={<AdvancedSettings />} />
                    <Route path="/owner/advanced-settings" element={<AdvancedSettings />} />
                    <Route path="/showcase" element={<Showcase />} />
                    <Route path="/owner/showcase" element={<Showcase />} />
                    <Route path="/delivery-partners" element={<DeliveryPartners />} />
                    <Route path="/owner/delivery-partners" element={<DeliveryPartners />} />
                    <Route path="/push-broadcast" element={<NotificationsBroadcast />} />
                    <Route path="/owner/push-broadcast" element={<NotificationsBroadcast />} />
                  </Route>

                  <Route path="/orders/:id/invoice" element={<Guard isOwnerDomain><Invoice /></Guard>} />
                  <Route path="/owner/orders/:id/invoice" element={<Guard isOwnerDomain><Invoice /></Guard>} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : isDeliveryDomain ? (
                <Routes>
                  <Route path="/login" element={<DeliveryLogin />} />
                  <Route path="/delivery/login" element={<Navigate to="/login" replace />} />
                  <Route element={<DeliveryGuard><DeliveryLayout /></DeliveryGuard>}>
                    <Route path="/" element={<DeliveryDashboard />} />
                    <Route path="/delivery" element={<Navigate to="/" replace />} />
                    <Route path="/history" element={<DeliveryHistory />} />
                    <Route path="/delivery/history" element={<Navigate to="/history" replace />} />
                    <Route path="/profile" element={<DeliveryProfile />} />
                    <Route path="/delivery/profile" element={<Navigate to="/profile" replace />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : isDownloadDomain ? (
                <Routes>
                  <Route path="/" element={<DownloadPage />} />
                  <Route path="/download" element={<Navigate to="/" replace />} />
                  <Route path="/downloads" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : (
                <Routes>
                  {/* Customer Routes with CartProvider */}
                  <Route element={<CustomerApp />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/product/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/download" element={<DownloadPage />} />
                    <Route path="/downloads" element={<Navigate to="/download" replace />} />
                    <Route path="/download-apk/*" element={<Navigate to="/download" replace />} />
                    <Route path="/checkout" element={<CustomerGuard><CheckoutPage /></CustomerGuard>} />
                    <Route path="/orders/:id" element={<CustomerGuard><OrderDetailPage /></CustomerGuard>} />
                    <Route path="/order/:id" element={<CustomerGuard><OrderDetailPage /></CustomerGuard>} />
                    <Route path="/orders/:id/invoice" element={<CustomerGuard><Invoice /></CustomerGuard>} />
                    <Route path="/order/:id/invoice" element={<CustomerGuard><Invoice /></CustomerGuard>} />
                    <Route path="/invoice/:id" element={<CustomerGuard><Invoice /></CustomerGuard>} />
                    
                    {/* Modular Customer Profile */}
                    <Route path="/profile" element={<CustomerGuard><ProfileLayout /></CustomerGuard>}>
                      <Route index element={<DashboardHome />} />
                      <Route path="account" element={<AccountSettings />} />
                      <Route path="orders" element={<OrdersHistory />} />
                      <Route path="addresses" element={<SavedAddresses />} />
                      <Route path="favorites" element={<Favorites />} />
                      <Route path="notifications" element={<Notifications />} />
                      <Route path="feedback" element={<CustomerFeedback />} />
                      <Route path="help" element={<HelpCenter />} />
                      <Route path="wallet" element={<Wallet />} />
                      <Route path="refer-and-earn" element={<ReferAndEarn />} />
                      <Route path="settings" element={<AppSettings />} />
                      <Route path="offers" element={<OffersPromoCodes />} />
                      <Route path="language" element={<LanguageSettings />} />
                    </Route>
                    
                    <Route path="/settings" element={<CustomerLayout><main className="w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 min-h-[70vh]"><AppSettings /></main></CustomerLayout>} />
                    <Route path="/offers" element={<CustomerGuard><Navigate to="/profile/offers" replace /></CustomerGuard>} />
                    <Route path="/notifications" element={<Navigate to="/profile/notifications" replace />} />
                    
                    <Route path="/login" element={<CustomerLoginPage />} />
                    <Route path="/signup" element={<CustomerSignupPage />} />
                  </Route>

                  {/* Public Auth & Password Recovery Routes (Completely decoupled from CartProvider & background fetches) */}
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Owner & Delivery Portal Routes: Redirect to dedicated domains on production, keep available on localhost */}
                  {isLocalhost ? (
                    <>
                      <Route path="/owner/login" element={<OwnerLogin />} />
                      <Route path="/owner/forgot-password" element={<OwnerForgotPassword />} />
                      <Route path="/owner/reset-password" element={<OwnerResetPassword />} />
                      <Route path="/owner/welcome" element={<Guard><Welcome /></Guard>} />
                      
                      <Route path="/owner" element={<Guard><OwnerLayout /></Guard>}>
                        <Route index element={<Dashboard />} />
                        <Route path="sales" element={<Sales />} />
                        <Route path="categories" element={<Categories />} />
                        <Route path="products" element={<Products />} />
                        <Route path="orders" element={<Orders />} />
                        <Route path="orders/:id" element={<OrderDetails />} />
                        <Route path="invoices" element={<Invoices />} />
                        <Route path="offers" element={<Offers />} />
                        <Route path="referrals" element={<Referrals />} />
                        <Route path="customers" element={<Customers />} />
                        <Route path="feedback" element={<Feedback />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="advanced-settings" element={<AdvancedSettings />} />
                        <Route path="showcase" element={<Showcase />} />
                        <Route path="delivery-partners" element={<DeliveryPartners />} />
                        <Route path="push-broadcast" element={<NotificationsBroadcast />} />
                      </Route>

                      <Route path="/owner/orders/:id/invoice" element={<Guard><Invoice /></Guard>} />

                      <Route path="/delivery/login" element={<DeliveryLogin />} />
                      <Route element={<DeliveryGuard><DeliveryLayout /></DeliveryGuard>}>
                        <Route path="/delivery" element={<DeliveryDashboard />} />
                        <Route path="/delivery/history" element={<DeliveryHistory />} />
                        <Route path="/delivery/profile" element={<DeliveryProfile />} />
                      </Route>
                    </>
                  ) : (
                    <>
                      <Route path="/owner/*" element={<OwnerExternalRedirect />} />
                      <Route path="/owner" element={<OwnerExternalRedirect />} />
                      <Route path="/delivery/*" element={<DeliveryExternalRedirect />} />
                      <Route path="/delivery" element={<DeliveryExternalRedirect />} />
                    </>
                  )}

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </Suspense>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </GoogleOAuthProvider>
  );
}

export default App;
