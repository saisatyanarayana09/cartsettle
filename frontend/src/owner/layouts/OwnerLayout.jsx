import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Outlet, Link, useLocation } from '../../router';
import { 
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Settings, 
  Menu, X, LogOut, PercentCircle, MessageSquare, Layout, Gift, 
  TrendingUp, Sun, Moon, SlidersHorizontal,
  Truck, Bell, BellRing, Bot, Sparkles, QrCode, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import api, { invalidateCache } from '../../services/api';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { playOrderChime } from '../../utils/sound';
// Loaded on first open so the co-pilot's heavy chat/voice code never delays the owner panel.
const KiranaCopilotDrawer = lazy(() => import('../components/KiranaCopilotDrawer'));
const QRScanner = lazy(() => import('../components/QRScanner'));

const OwnerLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [ownerUsername, setOwnerUsername] = useState(() => {
    try {
      return localStorage.getItem('smart-kirana-owner-username') || 'Active';
    } catch {
      return 'Active';
    }
  });

  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);
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

  // Sync .owner-theme on document.body for portaled modals & dialogs
  useEffect(() => {
    document.body.classList.add('owner-theme');
    return () => {
      document.body.classList.remove('owner-theme');
    };
  }, []);

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
      className="owner-theme flex h-[100dvh] w-full bg-[#F9F6EF] dark:bg-[#2D1822] font-enterprise overflow-hidden text-[#2D1822] dark:text-[#FAF5EF]"
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#FAF5EF] dark:bg-[#351D28] text-[#56323E] dark:text-[#E8DED5] transform transition-all duration-300 ease-in-out lg:static lg:inset-0 flex flex-col shadow-2xl lg:shadow-none border-r border-[#E7DBCF] dark:border-white/[0.08] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isSidebarCollapsed ? 'lg:hidden' : 'lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between min-h-[74px] px-5 bg-[#F9F6EF] dark:bg-[#2D1822] border-b border-[#E7DBCF] dark:border-white/[0.08] shrink-0">
          <div className="flex flex-col">
            <Link
              to="/owner"
              className="flex items-center tracking-tight whitespace-nowrap text-2xl font-black hover:opacity-90 transition-opacity"
            >
              <span className="font-black text-slate-900 dark:text-white">Cart</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">Settle</span>
            </Link>
            {/* Store Manager role indicator */}
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Store Manager
              </span>
              <span className="text-[10px] text-[#7D6671] dark:text-[#EDE4DC] font-mono truncate max-w-[90px]">
                {ownerUsername}
              </span>
            </div>
          </div>
          <button className="lg:hidden text-[#7D6671] hover:text-[#2D1822] dark:hover:text-white transition-colors p-1" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-[#8A6773] dark:text-[#A68B98] uppercase font-enterprise">
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
                    className={`flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group ${
                      active
                        ? 'bg-[#56323E] text-[#FAF5EF] font-semibold shadow-xs dark:bg-[#EFDFD2] dark:text-[#2D1822]'
                        : 'text-[#7D6671] dark:text-[#C5B0BA] hover:bg-[#EFDFD2]/50 dark:hover:bg-white/[0.04] hover:text-[#2D1822] dark:hover:text-white'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Icon className={`w-4 h-4 mr-2.5 transition-colors ${active ? 'text-[#FAF5EF] dark:text-[#2D1822]' : 'text-[#8A6773] dark:text-[#A68B98] group-hover:text-[#2D1822] dark:group-hover:text-white'}`} />
                    <span className="flex-1 truncate">{item.name}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-[#EFDFD2] dark:bg-[#56323E] animate-pulse" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 w-full p-3 border-t border-[#E7DBCF] dark:border-white/[0.08] bg-[#F9F6EF]/50 dark:bg-[#2D1822] flex flex-col gap-1">
          <button 
            type="button"
            onClick={() => toggleTheme()}
            className="flex items-center w-full px-3 py-2 text-[#7D6671] dark:text-[#C5B0BA] rounded-lg hover:bg-[#EFDFD2]/50 dark:hover:bg-white/[0.05] hover:text-[#2D1822] dark:hover:text-white transition-all text-xs font-medium"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 mr-2.5 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 mr-2.5 text-[#56323E]" />
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button 
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-[#7D6671] dark:text-[#C5B0BA] rounded-lg hover:bg-rose-50 dark:hover:bg-white/[0.05] hover:text-rose-600 dark:hover:text-rose-400 transition-all text-xs font-medium"
          >
            <LogOut className="w-4 h-4 mr-2.5 text-[#8A6773] group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors"/>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`owner-layout-container ${isCopilotOpen ? 'assistant-open' : ''} flex flex-col flex-1 overflow-hidden min-w-0`}>
        {/* Desktop Top Header Bar */}
        <header className="hidden lg:flex items-center justify-between h-14 px-6 bg-[#FAF5EF]/90 dark:bg-[#351D28]/90 border-b border-[#E7DBCF] dark:border-white/[0.08] shrink-0 z-20 backdrop-blur-md transition-colors">
          <div className="flex items-center gap-2.5">
            {isSidebarCollapsed && (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 rounded-lg border border-[#E7DBCF] dark:border-white/10 bg-[#FAF5EF] dark:bg-[#3F2231] text-[#56323E] dark:text-[#FAF5EF] hover:bg-[#EFDFD2] dark:hover:bg-[#432634] transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs mr-1"
                title="View Navbar (Expand Sidebar)"
              >
                <PanelLeftOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>View Navbar</span>
              </button>
            )}
            <span className="text-xs font-medium text-[#7D6671] dark:text-[#C5B0BA]">Owner</span>
            <span className="text-[#C2A49B] dark:text-slate-600">/</span>
            <span className="text-sm font-semibold text-[#2D1822] dark:text-[#FAF5EF] flex items-center gap-2 font-enterprise">
              <currentSection.icon size={16} className="text-[#56323E] dark:text-[#EFDFD2]" />
              {currentSection.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Push Notifications Enable Prompt */}
            {notificationPermission === 'default' && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7DBCF] bg-[#EFDFD2]/60 text-[#56323E] dark:bg-[#432634] dark:text-[#FAF5EF] text-xs font-semibold hover:bg-[#EFDFD2] transition-all shadow-sm"
                title="Enable live order sound and push alerts in your browser"
              >
                <BellRing size={14} className="animate-pulse" />
                <span>Enable Alerts</span>
              </button>
            )}

            {/* Scan Button (Integrated in place of Storefront) */}
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7DBCF] dark:border-white/10 bg-[#FAF5EF] hover:bg-[#EFDFD2] dark:bg-[#3F2231] dark:hover:bg-[#432634] text-xs font-semibold text-[#56323E] dark:text-[#FAF5EF] transition-all shadow-2xs cursor-pointer"
              title="Scan customer QR code or order barcode"
            >
              <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Scan</span>
            </button>

            {/* AI Assistant Button (disappears when open) vs Hide / View Navbar Toggle */}
            {!isCopilotOpen ? (
              <button
                type="button"
                onClick={() => setIsCopilotOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                title="Open CartSettle AI Assistant"
              >
                <Bot className="w-4 h-4" />
                <span>AI Assistant</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7DBCF] dark:border-white/10 bg-[#FAF5EF] hover:bg-[#EFDFD2] dark:bg-[#3F2231] dark:hover:bg-[#432634] text-xs font-bold text-[#56323E] dark:text-[#FAF5EF] transition-all shadow-2xs cursor-pointer active:scale-95"
                title={isSidebarCollapsed ? "Show Navbar (Expand Sidebar)" : "Hide Navbar (Collapse Sidebar for Full Width)"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-[#56323E] dark:text-[#FAF5EF]" />
                )}
                <span>{isSidebarCollapsed ? 'View Navbar' : 'Hide Navbar'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Header */}
        <header className="flex items-center justify-between h-14 px-4 bg-[#FAF5EF] dark:bg-[#351D28] border-b border-[#E7DBCF] dark:border-white/[0.08] lg:hidden shrink-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#56323E] dark:text-[#FAF5EF] hover:bg-[#EFDFD2]/50 dark:hover:bg-white/[0.05] rounded-lg transition-colors"
              aria-label="Open menu"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="w-5 h-5"/>
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-[#2D1822] dark:text-[#FAF5EF] leading-tight font-editorial">
                {currentSection.name}
              </span>
              <span className="text-[10px] text-[#7D6671] dark:text-[#EDE4DC] font-enterprise-mono leading-none">
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
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#E7DBCF] bg-[#EFDFD2]/60 text-[#56323E] dark:bg-[#432634] dark:text-[#FAF5EF] text-xs"
                title="Enable live order sound and push alerts"
              >
                <BellRing size={15} className="animate-pulse" />
              </button>
            )}

            {/* Mobile Scan Button */}
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#E7DBCF] dark:border-white/[0.08] bg-[#FAF5EF] dark:bg-[#351D28] text-[#56323E] dark:text-[#FAF5EF] text-xs transition-all"
              title="Scan QR Code"
            >
              <QrCode size={16} className="text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* Mobile AI Assistant Button */}
            {!isCopilotOpen && (
              <button
                type="button"
                onClick={() => setIsCopilotOpen(true)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs transition-all shadow-sm"
                title="Open AI Assistant"
              >
                <Bot size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Mobile Quick Section Switcher – top primary actions */}
        <div className="lg:hidden bg-[#FAF5EF] dark:bg-[#351D28] border-b border-[#E7DBCF] dark:border-white/[0.08] px-3 py-2 overflow-x-auto hide-scrollbar flex items-center gap-1.5 shrink-0">
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-[#56323E] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:text-[#2D1822]'
                    : 'bg-[#EFDFD2]/60 text-[#7D6671] border border-[#E7DBCF] dark:bg-white/[0.04] dark:text-[#C5B0BA] dark:border-white/[0.06]'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F9F6EF] dark:bg-[#2D1822] p-3.5 sm:p-5 pb-24 sm:pb-8">
          <Outlet />
        </main>


        {/* Floating CartSettle AI launcher */}
        {!isCopilotOpen && (
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-bold text-xs shadow-xl shadow-emerald-950/20 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-emerald-400/30"
            title="Open CartSettle AI"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span>CartSettle AI</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
          </button>
        )}

        {(isCopilotOpen || copilotLoaded) && (
          <Suspense fallback={null}>
            <KiranaCopilotDrawer
              isOpen={isCopilotOpen}
              onClose={() => setIsCopilotOpen(false)}
            />
          </Suspense>
        )}

        {/* In-Navbar Quick QR & Barcode Scanner */}
        {isScanModalOpen && (
          <Suspense fallback={null}>
            <QRScanner
              onScan={(decoded) => {
                setIsScanModalOpen(false);
                const trimmed = decoded?.trim() || '';
                toast.success(`Scanned: ${trimmed}`);
                if (trimmed.startsWith('ORD') || /^\d+$/.test(trimmed)) {
                  window.location.href = `/owner/orders/${trimmed}`;
                } else if (trimmed.includes('/orders/')) {
                  const match = trimmed.match(/\/orders\/([^/?#]+)/);
                  if (match) window.location.href = `/owner/orders/${match[1]}`;
                }
              }}
              onClose={() => setIsScanModalOpen(false)}
            />
          </Suspense>
        )}


      </div>
    </div>
  );
};

export default OwnerLayout;


