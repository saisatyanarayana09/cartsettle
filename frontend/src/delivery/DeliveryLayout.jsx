import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2, User, LogOut } from 'lucide-react';
import api, { clearAllBrowserCaches } from '../services/api';

export default function DeliveryLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [partnerUser, setPartnerUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('smart-kirana-delivery-user') || 'null');
    } catch {
      return null;
    }
  });
  const [activeCount, setActiveCount] = useState(0);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/delivery/dashboard/');
      if (res.data?.active_orders) {
        setActiveCount(res.data.active_orders.length);
      }
    } catch (err) {
      console.warn('Could not sync delivery status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    const refresh = localStorage.getItem('smart-kirana-delivery-refresh');
    if (refresh) {
      api.post('/auth/logout/', { refresh }).catch(() => {});
    }
    await clearAllBrowserCaches();
    localStorage.removeItem('smart-kirana-delivery-token');
    localStorage.removeItem('smart-kirana-delivery-refresh');
    localStorage.removeItem('smart-kirana-delivery-user');
    navigate('/login');
  };

  const navItems = [
    { label: 'Active Trips', path: '/', icon: Truck, badge: activeCount > 0 ? activeCount : null },
    { label: 'History', path: '/history', icon: CheckCircle2 },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  const riderName = partnerUser?.first_name
    ? `${partnerUser.first_name} ${partnerUser.last_name || ''}`.trim()
    : partnerUser?.username || 'Rider';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-black">

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-2xl border-b border-slate-800/80 px-4 py-2.5 sm:px-8 lg:px-12 shadow-lg shadow-black/20">
        <div className="w-full flex items-center justify-between gap-4">

          {/* Brand Mark + Rider identity */}
          <Link to="/profile" className="flex items-center gap-3 group min-w-0">
            {/* NK Logo mark */}
            <div className="size-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <Truck size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-white truncate group-hover:text-emerald-400 transition-colors">
                  {riderName}
                </p>
                <span className="hidden sm:inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 tracking-wider">
                  Rider
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">Narendra Kirana</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="size-4 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black flex items-center justify-center ml-0.5">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Logout */}
          <button
            onClick={handleLogout}
            className="size-9 rounded-xl bg-slate-800/70 hover:bg-rose-500/15 hover:text-rose-400 border border-slate-700/60 flex items-center justify-center text-slate-400 transition-all cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-6 pb-24 sm:pb-8">
        <Outlet context={{ fetchStatus, activeCount }} />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800/80 px-2 py-2 flex items-center justify-around pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl shadow-black">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center py-1.5 px-5 rounded-xl transition-all duration-200 cursor-pointer ${
                active ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {/* Active indicator dot */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-emerald-400 rounded-full" />
              )}
              <div className="relative">
                <Icon size={21} className={active ? 'stroke-[2.5]' : 'stroke-[1.75]'} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 size-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center ring-2 ring-slate-900">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-bold ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
