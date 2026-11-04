import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Outlet, Link, useLocation } from '../../router';
import { 
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Settings, 
  Menu, X, LogOut, PercentCircle, MessageSquare, Layout, Gift, 
  TrendingUp, Sun, Moon, FileText, SlidersHorizontal,
  Truck, Bell, BellRing, Bot, Sparkles
} from 'lucide-react';
import api, { invalidateCache } from '../../services/api';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { playOrderChime } from '../../utils/sound';
// Loaded on first open so the co-pilot's heavy chat/voice code never delays the owner panel.
const KiranaCopilotDrawer = lazy(() => import('../components/KiranaCopilotDrawer'));

const OwnerLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotLoaded, setCopilotLoaded] = useState(false);
  useEffect(() => {
    if (isCopilotOpen) setCopilotLoaded(true);
  }, [isCopilotOpen]);
  const [storeStatus, setStoreStatus] = useState({ is_open: true, loaded: false });
  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
  });
  const location = useLocation();

  const navGroups = [
    {
      group: 'Operations',
      items: [
        { name: 'Dashboard', href: '/owner', icon: LayoutDashboard },
        { name: 'Orders', href: '/owner/orders', icon: ShoppingCart },
        { name: 'Invoices', href: '/owner/invoices', icon: FileText },
        { name: 'Delivery Fleet', href: '/owner/delivery-partners', icon: Truck },
      ]
    },
    {
      group: 'Catalog & Storefront',
      items: [
        { name: 'Products', href: '/owner/products', icon: Package },
        { name: 'Categories', href: '/owner/categories', icon: Tags },
        { name: 'Showcase', href: '/owner/showcase', icon: Layout },
      ]
    },
    {
      group: 'Growth & CRM',
      items: [
        { name: 'Offers & Discounts', href: '/owner/offers', icon: PercentCircle },
        { name: 'Push Broadcast', href: '/owner/push-broadcast', icon: Bell },
        { name: 'Customers', href: '/owner/customers', icon: Users },
        { name: 'Referral Rewards', href: '/owner/referrals', icon: Gift },
        { name: 'Customer Feedback', href: '/owner/feedback', icon: MessageSquare },
      ]
    },
    {
      group: 'Analytics & Settings',
      items: [
        { name: 'Sales Analytics', href: '/owner/sales', icon: TrendingUp },
        { name: 'Settings', href: '/owner/settings', icon: Settings },
        { name: 'Advanced Settings', href: '/owner/advanced-settings', icon: SlidersHorizontal },
      ]
    }
  ];

  const allNavItems = navGroups.flatMap(group => group.items);

  // Fetch store status for header
  useEffect(() => {
    api.get('/store/settings/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        if (data) setStoreStatus({ is_open: data.is_open, loaded: true });
      })
      .catch(() => {});
  }, []);

  const isActive = (path) => {
    const currentPath = location.pathname.replace(/\/$/, '') || '/';
    const targetPath = path.replace(/\/$/, '') || '/';
    if (targetPath === '/owner') return currentPath === '/owner';
    if (targetPath === '/owner') return currentPath === '/owner' || currentPath === '/';
    const strippedTarget = targetPath.replace(/^\/owner/, '');
    return currentPath.startsWith(targetPath) || Boolean(strippedTarget && currentPath.startsWith(strippedTarget));
  };

  const currentSection = allNavItems.find(item => isActive(item.href)) || allNavItems[0];

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          toast.success('Live order alerts enabled');
          playOrderChime();
        } else {
          toast.error('Notification permission was blocked in browser settings.');
        }
      } catch {
        toast.error('Could not request notification permission.');
      }
    }
  };

  const handleWsMessage = useCallback((data) => {
    if (!data || !data.type) return;

    if (data.type === 'NEW_ORDER') {
      playOrderChime();
      const order = data.order || {};
      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex items-center p-3.5 border border-emerald-500 gap-3`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 dark:text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <ShoppingCart size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white dark:text-slate-900 truncate">
                New Order #{order.id}!
              </p>
              <p className="text-[11px] text-slate-300 dark:text-slate-600 truncate mt-0.5">
                ₹{order.total_amount} • {order.customer_name || 'Customer'}
              </p>
            </div>
            <Link
              to={`/owner/orders/${order.id}`}
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition shrink-0"
            >
              View
            </Link>
          </div>
        ),
        { duration: 10000, id: `new-order-${order.id}` }
      );

      // Trigger native browser notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification(`New Order #${order.id} Received`, {
            body: `₹${order.total_amount} placed by ${order.customer_name || 'Customer'}.`,
            tag: `order-${order.id}`,
          });
          n.onclick = () => {
            window.focus();
            window.location.href = `/owner/orders/${order.id}`;
          };
        } catch {}
      }
    }
  }, []);

  useWebSocket({
    path: '/ws/owner/orders/',
    onMessage: handleWsMessage,
  });

  const handleLogout = async () => {
    const refresh = localStorage.getItem('smart-kirana-owner-refresh');
    if (refresh) {
      api.post('/auth/logout/', { refresh }).catch(() => {});
    }

    // 1. Clear API in-memory response cache
    try {
      invalidateCache();
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

    // 4. Remove all owner authentication & local storage cache keys
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('smart-kirana-owner') || key.startsWith('sk_cache_') || key.startsWith('owner_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}

    localStorage.removeItem('smart-kirana-owner-token');
    localStorage.removeItem('smart-kirana-owner-refresh');
    localStorage.removeItem('smart-kirana-owner-user');
    localStorage.removeItem('smart-kirana-owner-username');

    window.location.href = '/owner/login';
  };

  const toggleStoreStatus = async () => {
    try {
      const newStatus = !storeStatus.is_open;
      await api.patch('/store/settings/', { is_open: newStatus });
      setStoreStatus({ is_open: newStatus, loaded: true });
      toast.success(newStatus ? 'Store is now LIVE!' : 'Store is now OFFLINE.');
    } catch {
      toast.error('Failed to update store status');
    }
  };

  return (
    <div
      className="owner-theme flex h-[100dvh] w-full bg-slate-50 dark:bg-[#090d16] overflow-hidden"
    >
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col shadow-2xl lg:shadow-none border-r border-slate-800 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex flex-col justify-center">
            <Link to="/owner" className="text-lg font-black tracking-tight whitespace-nowrap leading-tight">
              <span className="text-white">Cart</span>
              <span className="text-emerald-400">Settle</span>
            </Link>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">Owner Portal</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white transition-colors p-1" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {group.group}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Icon className={`w-4 h-4 mr-2.5 transition-colors ${active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="flex-1 truncate">{item.name}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 w-full p-3 border-t border-slate-800 bg-slate-950 flex flex-col gap-1">
          <button 
            type="button"
            onClick={() => toggleTheme()}
            className="flex items-center w-full px-3 py-2 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-xs font-medium"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 mr-2.5 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 mr-2.5 text-indigo-400" />
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button 
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-rose-400 transition-all text-xs font-medium"
          >
            <LogOut className="w-4 h-4 mr-2.5 text-slate-500 group-hover:text-rose-400 transition-colors"/>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Desktop Top Header Bar */}
        <header className="hidden lg:flex items-center justify-between h-14 px-6 bg-white dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 shrink-0 z-20 transition-colors">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Owner</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <currentSection.icon size={16} className="text-emerald-500" />
              {currentSection.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Push Notifications Enable Prompt */}
            {notificationPermission === 'default' && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all shadow-sm"
                title="Enable live order sound and push alerts in your browser"
              >
                <BellRing size={14} className="animate-pulse" />
                <span>Enable Alerts</span>
              </button>
            )}

            {/* Store Status Toggle for Desktop */}
            {storeStatus.loaded && (
              <button
                type="button"
                onClick={toggleStoreStatus}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  storeStatus.is_open 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' 
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                }`}
                title="Click to toggle store online/offline"
              >
                <span className={`w-2 h-2 rounded-full ${storeStatus.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>Store: <strong>{storeStatus.is_open ? 'Online' : 'Closed'}</strong></span>
              </button>
            )}

            {/* Desktop Theme Switcher */}
            <button
              type="button"
              onClick={() => toggleTheme()}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
            </button>

            {/* Storefront Link */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors px-2 py-1"
            >
              Storefront ↗
            </a>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="flex items-center justify-between h-14 px-4 bg-white dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 lg:hidden shrink-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5"/>
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                {currentSection.name}
              </span>
              <span className="text-[10px] text-slate-400 leading-none">
                CartSettle
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Push Notifications Enable Prompt Mobile */}
            {notificationPermission === 'default' && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="p-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs"
                title="Enable live order sound and push alerts"
              >
                <BellRing size={15} className="animate-pulse" />
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => toggleTheme()}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
            </button>

            {/* Store status pill */}
            {storeStatus.loaded && (
              <button
                onClick={toggleStoreStatus}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  storeStatus.is_open 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' 
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${storeStatus.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{storeStatus.is_open ? 'Online' : 'Closed'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Quick Section Switcher – top primary actions */}
        <div className="lg:hidden bg-white dark:bg-[#0d1322] border-b border-slate-200 dark:border-slate-800 px-3 py-2 overflow-x-auto hide-scrollbar flex items-center gap-1.5 shrink-0">
          {[
            { name: 'Dashboard', href: '/owner' },
            { name: 'Orders', href: '/owner/orders' },
            { name: 'Products', href: '/owner/products' },
            { name: 'Fleet', href: '/owner/delivery-partners' },
            { name: 'Offers', href: '/owner/offers' },
            { name: 'Settings', href: '/owner/settings' },
            { name: 'Advanced', href: '/owner/advanced-settings' },
          ].map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#090d16] p-4 sm:p-6 pb-8">
          <Outlet />
        </main>


        {/* Floating CartSettle assistant launcher */}
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-linear-to-r from-indigo-600 via-indigo-700 to-amber-500 text-white font-bold text-xs shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          title="Open CartSettle assistant"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span>CartSettle Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>

        {(isCopilotOpen || copilotLoaded) && (
          <Suspense fallback={null}>
            <KiranaCopilotDrawer
              isOpen={isCopilotOpen}
              onClose={() => setIsCopilotOpen(false)}
            />
          </Suspense>
        )}


      </div>
    </div>
  );
};

export default OwnerLayout;


