import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { 
  PackageSearch, Clock, TrendingUp, ChevronRight, 
  AlertTriangle, Plus, Gift, Tag, Activity,
  ShoppingBag
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ProductFormModal from '../components/ProductFormModal';
import ActiveOrdersModal from '../components/ActiveOrdersModal';
import { useWebSocket } from '../../hooks/useWebSocket';

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isActiveOrdersModalOpen, setIsActiveOrdersModalOpen] = useState(false);

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
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
  const allLowStock = products.filter(p => p.stock_quantity <= 5).sort((a, b) => a.stock_quantity - b.stock_quantity);
  const lowStockProducts = allLowStock.slice(0, 6);

  const getStatusBadge = (status) => {
    const styles = {
      NEW: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
      PREPARING: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
      READY: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
      COMPLETED: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
      REJECTED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
    };
    const style = styles[status] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    return (
      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border uppercase tracking-wider ${style}`}>
        {status}
      </span>
    );
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  const pendingCount = orders.filter(o => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {greeting}, {ownerName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            You have <span className="font-medium text-slate-900 dark:text-slate-200">{pendingCount} active {pendingCount === 1 ? 'order' : 'orders'}</span> requiring attention today.
          </p>
        </div>
        
        {/* Quick Access Hub */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsProductModalOpen(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Plus size={16} /> Add Product
          </button>
          <button 
              onClick={() => setIsActiveOrdersModalOpen(true)} 
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <Activity size={16} /> Active Orders
            </button>
          <Link 
            to="/owner/offers" 
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Tag size={16} /> Create Offer
          </Link>
          <Link 
            to="/owner/push-broadcast" 
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <Gift size={16} /> Broadcast
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Needs Approval</p>
            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
              <PackageSearch size={18} className="text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <p className="text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {loading ? '-' : newOrders}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Preparing Now</p>
            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
              <Clock size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {loading ? '-' : preparing}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today's Sales</p>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="relative z-10 text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
            ₹{loading || !analytics ? '-' : analytics.today_sales}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Live Orders (2/3 width on large screens) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">Active Orders</h2>
            <Link to="/owner/orders" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center transition-colors">
              View all <ChevronRight size={16} className="ml-1" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {loading && orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading orders...</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <PackageSearch className="text-slate-400" size={24} />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">No active orders</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">When customers place orders, they will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentOrders.map(order => (
                  <div key={order.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                        <ShoppingBag size={18} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            #{order.id}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link to={`/owner/orders/${order.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-sm truncate">
                            {order.customer_name || 'Guest User'}
                          </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                          <span>{order.items_count} items</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                          <span>{order.created_at ? `${new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                          <span className="font-semibold text-slate-900 dark:text-white">₹{order.total_amount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      {order.status === 'NEW' && (
                        <>
                          <button onClick={(e) => handleQuickAction(e, order.id, 'REJECTED')} className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:text-rose-600 text-slate-600 rounded-lg text-sm font-medium transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-rose-400 dark:hover:bg-slate-800">
                            Reject
                          </button>
                          <button onClick={(e) => handleQuickAction(e, order.id, 'ACCEPTED')} className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                            Accept
                          </button>
                        </>
                      )}
                      {order.status === 'ACCEPTED' && (
                        <button onClick={(e) => handleQuickAction(e, order.id, 'PREPARING')} className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                          Start Preparing
                        </button>
                      )}
                      {order.status === 'PREPARING' && (
                        <button onClick={(e) => handleQuickAction(e, order.id, 'READY')} className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                          Mark Ready
                        </button>
                      )}
                      {order.status === 'READY' && order.order_type !== 'PICKUP' && (
                        <button onClick={(e) => handleQuickAction(e, order.id, 'OUT_FOR_DELIVERY')} className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                          Out for Delivery
                        </button>
                      )}
                      {order.status === 'READY' && order.order_type === 'PICKUP' && (
                        <button onClick={(e) => handleQuickAction(e, order.id, 'COMPLETED')} className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                          Picked Up
                        </button>
                      )}
                      {['OUT_FOR_DELIVERY', 'COMPLETED', 'REJECTED'].includes(order.status) && (
                         <Link to={`/owner/orders/${order.id}`} className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-center">
                           View Details
                         </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>



          {/* App Download Links */}
          <div className="space-y-4 pt-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Share Apps</h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Share these links with your customers and staff to download the apps directly.</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Customer App</p>
                    <p className="text-xs text-slate-500 mt-0.5">For your buyers</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/download-apk/customer'); alert('Link copied!'); }} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors">Copy Link</button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Delivery App</p>
                    <p className="text-xs text-slate-500 mt-0.5">For your drivers</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/download-apk/delivery'); alert('Link copied!'); }} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors">Copy Link</button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Owner App</p>
                    <p className="text-xs text-slate-500 mt-0.5">For management</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/download-apk/owner'); alert('Link copied!'); }} className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors">Copy Link</button>
                </div>
              </div>
            </div>
          </div>

        {/* Low Stock Alerts (1/3 width on large screens) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Low Stock Alerts
              {lowStockProducts.length > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading inventory...</div>
            ) : lowStockProducts.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
                  <AlertTriangle className="text-emerald-500" size={20} />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Inventory is healthy</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No items are running low on stock.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {lowStockProducts.map(product => (
                  <div key={product.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-lg p-1.5 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">{product.name.charAt(0)}</div>
                          )}
                        </div>
                        <div className="overflow-hidden pr-2">
                          <Link to="/owner/products" className="text-sm font-medium text-slate-900 dark:text-white truncate hover:underline block">{product.name}</Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${product.stock_quantity === 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'}`}>
                              {product.stock_quantity === 0 ? 'OUT' : 'LOW'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{product.stock_quantity} {product.unit} left</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={(e) => handleQuickRestock(e, product, 10)} className="flex-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-xs font-medium transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                        +10
                      </button>
                      <button onClick={(e) => handleQuickRestock(e, product, 50)} className="flex-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-xs font-medium transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
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
    </div>
  );
};

export default Dashboard;
