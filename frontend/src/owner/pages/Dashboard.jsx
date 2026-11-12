import { useState, useEffect, useCallback } from 'react';
import { Link } from '../../router';

import { 
  PackageSearch, Clock, TrendingUp, ChevronRight, 
  AlertTriangle, Plus, Gift, Megaphone,
  ShoppingBag, Smartphone, Copy, Check, CheckCircle2,
  Package
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ProductFormModal from '../components/ProductFormModal';
import ActiveOrdersModal from '../components/ActiveOrdersModal';
import PackingSettlementModal from '../components/PackingSettlementModal';
import { useWebSocket } from '../../hooks/useWebSocket';

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isActiveOrdersModalOpen, setIsActiveOrdersModalOpen] = useState(false);
  const [settlementOrder, setSettlementOrder] = useState(null);
  const [mobileTab, setMobileTab] = useState('orders'); // 'orders' | 'inventory'

  const [ownerName, setOwnerName] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('smart-kirana-owner-user'));
      return [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Owner';
    } catch {
      return 'Owner';
    }
  });

  useEffect(() => {
    fetchDashboardData();
    api.get('/auth/profile/').then(res => {
      if (res.data) {
        localStorage.setItem('smart-kirana-owner-user', JSON.stringify(res.data));
        setOwnerName([res.data.first_name, res.data.last_name].filter(Boolean).join(' ') || res.data.username || 'Owner');
      }
    }).catch(() => {});
    const interval = setInterval(() => {
      if (!document.hidden) fetchDashboardData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleWsMessage = useCallback((data) => {
    if (!data || !data.type) return;
    if (data.type === 'NEW_ORDER' || data.type === 'ORDER_STATUS_CHANGED') {
      fetchDashboardData();
    }
  }, []);

  useWebSocket({
    path: '/ws/owner/orders/',
    onMessage: handleWsMessage,
  });

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, analyticsRes, productsRes] = await Promise.all([
        api.get('/orders/'),
        api.get('/orders/analytics/'),
        api.get('/products/?limit=100')
      ]);
      setOrders(ordersRes.data.results || ordersRes.data);
      setAnalytics(analyticsRes.data);
      setProducts(productsRes.data.results || productsRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRestock = async (e, product, amount) => {
    e.preventDefault();
    e.stopPropagation();
    
    const previousStock = product.stock_quantity;
    const newStock = previousStock + amount;
    setProducts(products.map(p => p.id === product.id ? { ...p, stock_quantity: newStock } : p));
    
    try {
      await api.patch(`/products/${product.id}/`, { stock_quantity: newStock });
      toast.success(`Restocked ${amount}x ${product.name}`);
    } catch {
      setProducts(products.map(p => p.id === product.id ? { ...p, stock_quantity: previousStock } : p));
      toast.error('Failed to restock items');
    }
  };

  const handleQuickAction = async (e, orderId, newStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (newStatus === 'REJECTED') {
      if (!window.confirm('Are you sure you want to reject this order?')) return;
    }
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    try {
      await api.patch(`/orders/${orderId}/status/`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      fetchDashboardData();
    } catch {
      toast.error('Failed to update order status');
      fetchDashboardData();
    }
  };

  const newOrders = orders.filter(o => o.status === 'NEW').length;
  const preparing = orders.filter(o => o.status === 'ACCEPTED' || o.status === 'PREPARING').length;
  const pendingPackingOrders = orders.filter(o => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status));
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
  const allLowStock = products.filter(p => p.stock_quantity <= 5).sort((a, b) => a.stock_quantity - b.stock_quantity);
  const lowStockProducts = allLowStock.slice(0, 6);

  const handleOpenPackingShortcut = async () => {
    if (pendingPackingOrders.length === 0) {
      toast('No pending orders need packing right now. All caught up!', { icon: '📦' });
      return;
    }
    const targetOrder = pendingPackingOrders[0];
    try {
      const res = await api.get(`/orders/${targetOrder.id}/`);
      setSettlementOrder(res.data);
    } catch {
      setSettlementOrder(targetOrder);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      NEW: {
        badge: 'bg-[#FAF5EF] text-[#56323E] border-[#E7DBCF] dark:bg-[#432634] dark:text-[#FAF5EF] dark:border-white/10 shadow-xs',
        dot: 'bg-[#56323E] dark:bg-[#EFDFD2] animate-pulse'
      },
      ACCEPTED: {
        badge: 'bg-[#F2E6DA] text-[#56323E] border-[#E7DBCF] dark:bg-[#3F2231] dark:text-[#EFDFD2] dark:border-white/10',
        dot: 'bg-[#56323E] dark:bg-[#EFDFD2]'
      },
      PREPARING: {
        badge: 'bg-[#FDF2EC] text-[#8C4A2B] border-[#F2DACD] dark:bg-[#4D2E24]/50 dark:text-[#E8B5A2] dark:border-[#6D4336]/60',
        dot: 'bg-[#A35C52] dark:bg-[#E8B5A2]'
      },
      READY: {
        badge: 'bg-[#FAF5EF] text-[#56323E] border-[#E7DBCF] dark:bg-[#432634] dark:text-[#FAF5EF] dark:border-white/10',
        dot: 'bg-[#56323E] dark:bg-[#EFDFD2]'
      },
      OUT_FOR_DELIVERY: {
        badge: 'bg-[#F5ECE1] text-[#56323E] border-[#E7DBCF] dark:bg-[#3F2231] dark:text-[#EFDFD2] dark:border-white/10',
        dot: 'bg-[#56323E] dark:bg-[#EFDFD2]'
      },
      COMPLETED: {
        badge: 'bg-[#EAF2EC] text-[#2F5238] border-[#CFDFD3] dark:bg-[#2D4536]/40 dark:text-[#A8D5B5] dark:border-[#3F634D]/50',
        dot: 'bg-[#4A6B56] dark:bg-[#A8D5B5]'
      },
      REJECTED: {
        badge: 'bg-[#FDF0F2] text-[#8E283E] border-[#F6D0D8] dark:bg-[#4A1A26]/40 dark:text-[#EFA3B2] dark:border-[#6B2838]/50',
        dot: 'bg-[#8E283E] dark:bg-[#EFA3B2]'
      }
    };
    const style = styles[status] || {
      badge: 'bg-[#FAF5EF] text-[#7D6671] border-[#E7DBCF] dark:bg-[#351D28] dark:text-[#C5B0BA] dark:border-white/10',
      dot: 'bg-[#7D6671]'
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full border uppercase tracking-wider font-enterprise whitespace-nowrap ${style.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const pendingCount = orders.filter(o => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 font-enterprise">
      
      {/* Top Action Bar Container Card (Linear/Awwwards Mockup Spec) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/[0.08] enterprise-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-[#2D1822] dark:text-[#FAF5EF] tracking-tight font-editorial">Action Bar</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFDFD2] text-[#56323E] border border-[#E7DBCF] dark:bg-[#432634] dark:text-[#FAF5EF] dark:border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#56323E] dark:bg-[#FAF5EF] animate-pulse" />
              Live Hub
            </span>
          </div>
          <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-0.5 font-enterprise">
            {greeting}, {ownerName} · <span className="font-enterprise-mono font-bold text-[#56323E] dark:text-[#EFDFD2] tabular-nums">{pendingCount} active {pendingCount === 1 ? 'order' : 'orders'}</span> requiring attention today.
          </p>
        </div>
        
        {/* Quick Creation Triggers & AI Packing Shortcut */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button 
            onClick={handleOpenPackingShortcut}
            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
            title="Open Packing Table & Dynamic Settlement"
          >
            <Package size={15} strokeWidth={2.5} className="shrink-0" />
            <span>AI Packing & Settlement</span>
            {pendingPackingOrders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] font-extrabold tabular-nums">
                {pendingPackingOrders.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setIsProductModalOpen(true)} 
            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#56323E] dark:hover:bg-[#432634] dark:text-[#FAF5EF] dark:border dark:border-white/10 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} strokeWidth={2.5} className="shrink-0" />
            <span>Add Product</span>
          </button>
          <Link 
            to="/owner/offers" 
            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FAF5EF] hover:bg-[#EFDFD2]/60 text-[#56323E] dark:bg-[#432634]/60 dark:hover:bg-[#432634] dark:text-[#FAF5EF] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
          >
            <Gift size={13} className="shrink-0 text-[#8A6773] dark:text-[#C5B0BA]" />
            <span>Create Offer</span>
          </Link>
          <Link 
            to="/owner/push-broadcast" 
            className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FAF5EF] hover:bg-[#EFDFD2]/60 text-[#56323E] dark:bg-[#432634]/60 dark:hover:bg-[#432634] dark:text-[#FAF5EF] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
          >
            <Megaphone size={13} className="shrink-0 text-[#8A6773] dark:text-[#C5B0BA]" />
            <span>Broadcast</span>
          </Link>
        </div>
      </div>

      {/* Hero Metrics Row (Compact 86px KPI Cards) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1: Needs Approval */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/[0.08] enterprise-card flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#7D6671] dark:text-[#C5B0BA] truncate">
              <span className="sm:hidden">Approval</span>
              <span className="hidden sm:inline">Needs Approval</span>
            </span>
            <div className="hidden sm:block p-1.5 bg-[#EFDFD2] text-[#56323E] border border-[#E7DBCF] dark:bg-[#432634] dark:text-[#FAF5EF] dark:border-white/10 rounded-lg">
              <PackageSearch size={15} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1 sm:mt-2">
            <p className="text-xl sm:text-3xl font-bold font-enterprise-mono tabular-nums text-[#2D1822] dark:text-[#FAF5EF] tracking-tight">
              {loading ? '-' : newOrders}
            </p>
            <span className="text-[9px] sm:text-[10px] font-semibold text-[#56323E] dark:text-[#FAF5EF] bg-[#EFDFD2] dark:bg-[#432634] border border-[#E7DBCF] dark:border-white/10 px-1.5 py-0.5 rounded whitespace-nowrap">
              Action Required
            </span>
          </div>
        </div>

        {/* Card 2: Preparing Now */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/[0.08] enterprise-card flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#7D6671] dark:text-[#C5B0BA] truncate">
              <span className="sm:hidden">Preparing</span>
              <span className="hidden sm:inline">Preparing Now</span>
            </span>
            <div className="hidden sm:block p-1.5 bg-[#F7EFE6] text-[#9B5C28] border border-[#EBD7C4] dark:bg-[#4A2F22]/50 dark:text-[#E8A870] dark:border-[#E8A870]/20 rounded-lg">
              <Clock size={15} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1 sm:mt-2">
            <p className="text-xl sm:text-3xl font-bold font-enterprise-mono tabular-nums text-[#2D1822] dark:text-[#FAF5EF] tracking-tight">
              {loading ? '-' : preparing}
            </p>
            <span className="text-[9px] sm:text-[10px] font-semibold text-[#9B5C28] dark:text-[#E8A870] bg-[#F7EFE6] dark:bg-[#4A2F22]/50 border border-[#EBD7C4] dark:border-[#E8A870]/20 px-1.5 py-0.5 rounded whitespace-nowrap">
              In Kitchen
            </span>
          </div>
        </div>

        {/* Card 3: Today's Revenue */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/[0.08] enterprise-card flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#7D6671] dark:text-[#C5B0BA] truncate">
              <span className="sm:hidden">Revenue</span>
              <span className="hidden sm:inline">Today's Revenue</span>
            </span>
            <div className="hidden sm:block p-1.5 bg-[#EEF5F0] text-[#3B5E43] border border-[#D3E5D7] dark:bg-[#233B29]/50 dark:text-[#A7D1AF] dark:border-[#A7D1AF]/20 rounded-lg">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1 sm:mt-2">
            <p className="text-xl sm:text-3xl font-bold font-enterprise-mono tabular-nums text-[#2D1822] dark:text-[#FAF5EF] tracking-tight">
              ₹{loading || !analytics ? '-' : Number(analytics.today_sales || 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[9px] sm:text-[10px] font-semibold text-[#3B5E43] dark:text-[#A7D1AF] bg-[#EEF5F0] dark:bg-[#233B29]/50 border border-[#D3E5D7] dark:border-[#A7D1AF]/20 px-1.5 py-0.5 rounded whitespace-nowrap">
              +18.4% vs yday
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Segmented Switcher (Zero-Scroll on Mobile) */}
      <div 
        role="tablist" 
        aria-label="Dashboard views" 
        className="flex lg:hidden bg-[#EFDFD2]/60 dark:bg-[#351D28] p-1.5 rounded-xl border border-[#E7DBCF] dark:border-white/[0.08] gap-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'orders'}
          onClick={() => setMobileTab('orders')}
          className={`flex-1 min-h-[44px] py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'orders'
              ? 'bg-[#56323E] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:text-[#2D1822] shadow-xs'
              : 'text-[#7D6671] dark:text-[#C5B0BA] hover:text-[#2D1822] dark:hover:text-white'
          }`}
        >
          <span>Active Orders</span>
          <span className="font-enterprise-mono text-[10px] px-1.5 py-0.5 rounded-full bg-[#EFDFD2] dark:bg-white/[0.08] text-[#56323E] dark:text-[#FAF5EF] font-bold">
            {recentOrders.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'inventory'}
          onClick={() => setMobileTab('inventory')}
          className={`flex-1 min-h-[44px] py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'inventory'
              ? 'bg-[#56323E] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:text-[#2D1822] shadow-xs'
              : 'text-[#7D6671] dark:text-[#C5B0BA] hover:text-[#2D1822] dark:hover:text-white'
          }`}
        >
          <span>Low Stock</span>
          {lowStockProducts.length > 0 && (
            <span className="font-enterprise-mono text-[10px] px-1.5 py-0.5 rounded-full bg-[#EFDFD2] text-[#56323E] dark:bg-[#432634] dark:text-[#FAF5EF] font-bold">
              {lowStockProducts.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Grid: 2-Column on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Live Active Orders Queue (2 cols on large screen) */}
        <div className={`lg:col-span-2 space-y-4 ${mobileTab === 'orders' ? 'block' : 'hidden lg:block'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#2D1822] dark:text-white tracking-tight flex items-center gap-2">
              <span>Active Orders Queue</span>
              <span className="font-enterprise-mono text-[11px] px-2 py-0.5 rounded-full bg-[#EFDFD2] dark:bg-white/[0.06] text-[#56323E] dark:text-[#EFDFD2] border border-[#E7DBCF] dark:border-white/10 font-bold">
                {recentOrders.length}
              </span>
            </h2>
            <Link to="/owner/orders" className="text-xs font-semibold text-[#7D6671] dark:text-[#C5B0BA] hover:text-[#56323E] dark:hover:text-white flex items-center gap-1 transition-colors">
              <span>View all orders</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="rounded-xl bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/[0.08] enterprise-card overflow-hidden shadow-xs dark:shadow-lg dark:shadow-black/20">
            {loading && orders.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#7D6671] dark:text-[#C5B0BA]">Loading orders...</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-[#FAF5EF] dark:bg-white/[0.04] border border-[#E7DBCF] dark:border-white/[0.08] flex items-center justify-center mb-3">
                  <PackageSearch className="text-[#8A6773] dark:text-[#C5B0BA]" size={22} />
                </div>
                <p className="text-sm font-semibold text-[#2D1822] dark:text-white">No active orders</p>
                <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1">When customers place orders, they will appear here live.</p>
              </div>
            ) : (
              <div>
                {/* Desktop High-Density Tabular View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E7DBCF] dark:border-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-[#7D6671] dark:text-[#C5B0BA] bg-[#FAF5EF]/70 dark:bg-white/[0.02]">
                        <th scope="col" className="py-2.5 px-4">ID #</th>
                        <th scope="col" className="py-2.5 px-3">Status</th>
                        <th scope="col" className="py-2.5 px-3">Customer</th>
                        <th scope="col" className="py-2.5 px-3 text-center">Items</th>
                        <th scope="col" className="py-2.5 px-3">Amount ₹</th>
                        <th scope="col" className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7DBCF]/50 dark:divide-white/[0.04]">
                      {recentOrders.map(order => (
                        <tr key={order.id} className="hover:bg-[#FAF5EF]/60 dark:hover:bg-white/[0.02] transition-colors group">
                          <td className="py-3 px-4">
                            <span className="font-enterprise-mono text-xs font-bold text-[#56323E] dark:text-[#EFDFD2] bg-[#EFDFD2]/60 dark:bg-white/[0.06] px-2 py-0.5 rounded border border-[#E7DBCF] dark:border-white/10">
                              #{order.id}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="py-3 px-3">
                            <Link to={`/owner/orders/${order.id}`} className="font-semibold text-[#2D1822] dark:text-white hover:text-[#56323E] dark:hover:text-[#EFDFD2] text-xs sm:text-sm truncate transition-colors max-w-[150px] block">
                              {order.customer_name || 'Guest User'}
                            </Link>
                            <span className="text-[10px] text-[#7D6671] dark:text-[#C5B0BA] font-enterprise-mono block mt-0.5">
                              {order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-enterprise-mono text-xs text-[#7D6671] dark:text-[#C5B0BA] tabular-nums">
                            {order.items_count ?? order.items?.length ?? 1}
                          </td>
                          <td className="py-3 px-3 font-enterprise-mono font-bold text-[#2D1822] dark:text-white text-xs sm:text-sm tabular-nums">
                            ₹{order.total_amount}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.status === 'NEW' && (
                                <>
                                  <button 
                                    onClick={(e) => handleQuickAction(e, order.id, 'ACCEPTED')} 
                                    className="px-3 py-1 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:hover:bg-[#E7DBCF] dark:text-[#2D1822] rounded-md text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
                                    aria-label={`Accept order #${order.id}`}
                                  >
                                    Accept
                                  </button>
                                  <button 
                                    onClick={(e) => handleQuickAction(e, order.id, 'REJECTED')} 
                                    className="px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-500/20 hover:border-rose-400 dark:hover:border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                    aria-label={`Reject order #${order.id}`}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {order.status === 'ACCEPTED' && (
                                <button 
                                  onClick={(e) => handleQuickAction(e, order.id, 'PREPARING')} 
                                  className="px-3 py-1 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:hover:bg-[#E7DBCF] dark:text-[#2D1822] rounded-md text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                  aria-label={`Start preparing order #${order.id}`}
                                >
                                  Start Preparing
                                </button>
                              )}
                              {order.status === 'PREPARING' && (
                                <button 
                                  onClick={(e) => handleQuickAction(e, order.id, 'READY')} 
                                  className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-400 dark:border-amber-500/30 rounded-md text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                  aria-label={`Mark order #${order.id} ready`}
                                >
                                  Mark Ready
                                </button>
                              )}
                              {order.status === 'READY' && order.order_type !== 'PICKUP' && (
                                <button 
                                  onClick={(e) => handleQuickAction(e, order.id, 'OUT_FOR_DELIVERY')} 
                                  className="px-3 py-1 bg-[#FAF5EF] text-[#56323E] border border-[#E7DBCF] dark:bg-[#432634] dark:hover:bg-[#432634] dark:text-[#EFDFD2] dark:border-white/10 rounded-md text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                  aria-label={`Send order #${order.id} out for delivery`}
                                >
                                  Out for Delivery
                                </button>
                              )}
                              {order.status === 'READY' && order.order_type === 'PICKUP' && (
                                <button 
                                  onClick={(e) => handleQuickAction(e, order.id, 'COMPLETED')} 
                                  className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/30 rounded-md text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                  aria-label={`Mark order #${order.id} picked up`}
                                >
                                  Picked Up
                                </button>
                              )}
                              {['OUT_FOR_DELIVERY', 'COMPLETED', 'REJECTED'].includes(order.status) && (
                                <Link 
                                  to={`/owner/orders/${order.id}`} 
                                  className="px-2.5 py-1 rounded-md border border-[#E7DBCF] dark:border-white/10 hover:bg-[#FAF5EF] dark:hover:bg-white/[0.06] text-[#56323E] dark:text-[#EFDFD2] text-xs font-medium transition-all"
                                  aria-label={`View details for order #${order.id}`}
                                >
                                  Details
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: High-Density Cards */}
                <div className="sm:hidden divide-y divide-[#E7DBCF]/50 dark:divide-white/[0.06]">
                  {recentOrders.map(order => (
                    <div key={order.id} className="p-3 hover:bg-[#FAF5EF]/60 dark:hover:bg-white/[0.02] transition-colors flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-enterprise-mono text-xs font-bold text-[#56323E] dark:text-[#EFDFD2] bg-[#EFDFD2]/60 dark:bg-white/[0.06] px-2 py-0.5 rounded border border-[#E7DBCF] dark:border-white/10">
                            #{order.id}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <span className="font-bold text-[#2D1822] dark:text-white font-enterprise-mono tabular-nums text-sm">
                          ₹{order.total_amount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Link to={`/owner/orders/${order.id}`} className="font-semibold text-[#2D1822] dark:text-white text-xs truncate">
                          {order.customer_name || 'Guest User'}
                        </Link>
                        <span className="text-[11px] text-[#7D6671] dark:text-[#C5B0BA] font-enterprise-mono">
                          {order.items_count ?? order.items?.length ?? 1} {(order.items_count ?? order.items?.length ?? 1) === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        {order.status === 'NEW' && (
                          <>
                            <button 
                              onClick={(e) => handleQuickAction(e, order.id, 'ACCEPTED')} 
                              className="flex-1 min-h-[44px] py-2 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:text-[#2D1822] font-bold rounded-lg text-xs flex items-center justify-center cursor-pointer"
                              aria-label={`Accept order #${order.id}`}
                            >
                              Accept
                            </button>
                            <button 
                              onClick={(e) => handleQuickAction(e, order.id, 'REJECTED')} 
                              className="px-3 min-h-[44px] py-2 rounded-lg border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center cursor-pointer"
                              aria-label={`Reject order #${order.id}`}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {['ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
                          <button 
                            onClick={(e) => handleQuickAction(e, order.id, order.status === 'ACCEPTED' ? 'PREPARING' : order.status === 'PREPARING' ? 'READY' : 'COMPLETED')} 
                            className="w-full min-h-[44px] py-2 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:hover:bg-[#E7DBCF] dark:text-[#2D1822] font-bold rounded-lg text-xs flex items-center justify-center cursor-pointer"
                            aria-label={`Progress order #${order.id}`}
                          >
                            {order.status === 'ACCEPTED' ? 'Start Preparing' : order.status === 'PREPARING' ? 'Mark Ready' : 'Complete'}
                          </button>
                        )}
                        {['OUT_FOR_DELIVERY', 'COMPLETED', 'REJECTED'].includes(order.status) && (
                          <Link 
                            to={`/owner/orders/${order.id}`} 
                            className="w-full min-h-[44px] py-2 rounded-lg border border-[#E7DBCF] dark:border-white/10 text-[#56323E] dark:text-[#EFDFD2] text-xs font-medium text-center flex items-center justify-center"
                            aria-label={`View details for order #${order.id}`}
                          >
                            View Details
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inventory Alerts First, Share Apps Second */}
        <div className="space-y-6">
          
          {/* Low Stock Alerts */}
          <div className={`space-y-4 ${mobileTab === 'inventory' ? 'block' : 'hidden lg:block'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#2D1822] dark:text-white tracking-tight flex items-center gap-2">
                <span>Low Stock Alerts</span>
                {lowStockProducts.length > 0 && (
                  <span className="inline-flex items-center gap-1 font-enterprise-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
                    {lowStockProducts.length} items
                  </span>
                )}
              </h2>
              <Link to="/owner/products" className="text-xs font-semibold text-[#7D6671] dark:text-[#C5B0BA] hover:text-[#56323E] dark:hover:text-white flex items-center gap-1 transition-colors">
                <span>Inventory</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="rounded-xl bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/[0.08] enterprise-card overflow-hidden shadow-xs dark:shadow-lg dark:shadow-black/20">
              {loading ? (
                <div className="p-8 text-center text-xs font-mono text-[#7D6671] dark:text-[#C5B0BA]">Loading inventory...</div>
              ) : lowStockProducts.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mb-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={18} />
                  </div>
                  <p className="text-xs font-semibold text-[#2D1822] dark:text-white">Stock levels healthy</p>
                  <p className="text-[11px] text-[#7D6671] dark:text-[#C5B0BA] mt-0.5">No products require immediate restocking.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E7DBCF]/50 dark:divide-white/[0.06]">
                  {lowStockProducts.map(product => (
                    <div key={product.id} className="p-3 hover:bg-[#FAF5EF]/60 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-[#FAF5EF] dark:bg-white/[0.04] border border-[#E7DBCF] dark:border-white/[0.08] p-1 shrink-0 flex items-center justify-center">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[#8A6773] text-xs font-bold">{product.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="overflow-hidden pr-2">
                          <Link to="/owner/products" className="text-xs font-semibold text-[#2D1822] dark:text-white truncate hover:text-[#56323E] dark:hover:text-[#EFDFD2] block transition-colors">
                            {product.name}
                          </Link>
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-enterprise-mono mt-0.5">
                            Low stock {product.stock_quantity}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={(e) => handleQuickRestock(e, product, 10)} 
                          className="py-1 px-2 min-h-[36px] sm:min-h-0 bg-[#FAF5EF] hover:bg-[#EFDFD2] text-[#56323E] border border-[#E7DBCF] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:border-white/10 dark:text-[#EFDFD2] rounded text-xs font-enterprise-mono font-semibold transition-all active:scale-95 cursor-pointer"
                          title="Restock 10 units"
                          aria-label={`Restock 10 units of ${product.name}`}
                        >
                          +10
                        </button>
                        <button 
                          onClick={(e) => handleQuickRestock(e, product, 50)} 
                          className="py-1 px-2 min-h-[36px] sm:min-h-0 bg-[#FAF5EF] hover:bg-[#EFDFD2] text-[#56323E] border border-[#E7DBCF] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:border-white/10 dark:text-[#EFDFD2] rounded text-xs font-enterprise-mono font-semibold transition-all active:scale-95 cursor-pointer"
                          title="Restock 50 units"
                          aria-label={`Restock 50 units of ${product.name}`}
                        >
                          +50
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      <ProductFormModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        onSaveSuccess={fetchDashboardData} 
      />

      <ActiveOrdersModal 
        isOpen={isActiveOrdersModalOpen} 
        onClose={() => setIsActiveOrdersModalOpen(false)} 
        orders={orders}
        handleQuickAction={handleQuickAction}
        getStatusBadge={getStatusBadge}
      />

      {/* Dynamic Packing Table & Settlement Modal Shortcut */}
      {settlementOrder && (
        <PackingSettlementModal
          order={settlementOrder}
          isOpen={Boolean(settlementOrder)}
          onClose={() => setSettlementOrder(null)}
          onSettled={() => {
            setSettlementOrder(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
