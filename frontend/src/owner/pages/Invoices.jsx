import { useState, useEffect, useMemo } from 'react';
import { Link } from '../../router';
import { 
  FileText, 
  Search, 
  Printer, 
  Download, 
  ExternalLink, 
  Filter, 
  Calendar, 
  ArrowUpRight, 
  CreditCard, 
  Banknote, 
  BadgeCheck, 
  RefreshCw,
  Sliders,
  Package,
  Clock,
  ChevronRight,
  Copy
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import InvoiceModal from '../components/InvoiceModal';

const Invoices = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH
  const [paymentFilter, setPaymentFilter] = useState('ALL'); // ALL, PAYPAL, COD
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, COMPLETED, ACTIVE
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState(null);

  const fetchOrders = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const res = await api.get('/orders/', { params: { t: Date.now() } });
      const list = res.data.results || res.data;
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load orders for invoices:', err);
      if (!isPoll) toast.error('Failed to fetch store invoices.');
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 10000);
    return () => clearInterval(interval);
  }, []);

  // Filtered invoices
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return orders.filter(order => {
      // 1. Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (order.id && order.id.toString().toLowerCase().includes(searchLower)) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) ||
        (order.delivery_address && order.delivery_address.toLowerCase().includes(searchLower)) ||
        (order.paypal_authorization_id && order.paypal_authorization_id.toLowerCase().includes(searchLower)) ||
        (order.paypal_capture_id && order.paypal_capture_id.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // 2. Date filter
      if (dateFilter !== 'ALL') {
        const orderDate = new Date(order.created_at);
        if (dateFilter === 'TODAY' && orderDate < startOfToday) return false;
        if (dateFilter === 'WEEK' && orderDate < startOfWeek) return false;
        if (dateFilter === 'MONTH' && orderDate < startOfMonth) return false;
      }

      // 3. Payment filter
      if (paymentFilter !== 'ALL') {
        const method = (order.payment_method || 'COD').toUpperCase();
        if (paymentFilter === 'PAYPAL' && method !== 'PAYPAL' && !order.paypal_authorization_id && method !== 'UPI') return false;
        if (paymentFilter === 'COD' && method !== 'COD') return false;
      }

      // 4. Status filter
      if (statusFilter === 'COMPLETED' && order.status !== 'COMPLETED') return false;
      if (statusFilter === 'ACTIVE' && (order.status === 'COMPLETED' || order.status === 'REJECTED')) return false;

      return true;
    });
  }, [orders, searchTerm, dateFilter, paymentFilter, statusFilter]);

  // Financial Metrics
  const metrics = useMemo(() => {
    let totalBilled = 0;
    let onlineTotal = 0;
    let codTotal = 0;
    let completedCount = 0;

    filteredOrders.forEach(o => {
      const amount = parseFloat(o.total_amount) || 0;
      totalBilled += amount;
      const method = (o.payment_method || 'COD').toUpperCase();
      if (method === 'PAYPAL' || o.paypal_authorization_id || method === 'UPI') onlineTotal += amount;
      else codTotal += amount;
      if (o.status === 'COMPLETED') completedCount += 1;
    });

    return {
      totalBilled: totalBilled.toFixed(2),
      onlineTotal: onlineTotal.toFixed(2),
      codTotal: codTotal.toFixed(2),
      totalInvoices: filteredOrders.length,
      completedCount,
    };
  }, [filteredOrders]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error('No invoices to export.');
      return;
    }

    const headers = ['Invoice / Order ID', 'Date', 'Customer', 'Payment Method', 'PayPal Ref', 'Status', 'Total Amount (Rs.)'];
    const rows = filteredOrders.map(o => [
      `#${o.id}`,
      new Date(o.created_at).toLocaleString('en-IN'),
      o.customer_name || `Customer #${o.customer}`,
      (o.payment_method === 'UPI' || o.payment_method === 'PAYPAL' || o.paypal_authorization_id) ? 'PayPal' : (o.payment_method || 'COD'),
      o.paypal_capture_id || o.paypal_authorization_id || '-',
      o.status,
      o.total_amount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cartsettle_invoices_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Invoices summary CSV exported!');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#A68B98] mb-1">
            <Link to="/owner" className="hover:text-[#56323E] transition-colors">Owner Dashboard</Link>
            <span>/</span>
            <span className="text-[#5E4752] dark:text-[#C5B0BA]">Billing & Invoices</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#56323E] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:text-[#2D1822] shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2D1822] dark:text-white">Invoice Management</h1>
              <p className="text-sm text-[#7D6671] dark:text-[#C5B0BA]">Search, review, print, and export official GST customer tax invoices.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/owner/settings"
            className="px-4 py-2.5 rounded-xl border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] text-[#5E4752] dark:text-[#C5B0BA] hover:bg-[#FAF5EF] dark:hover:bg-[#432634] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Invoice Branding & Signature</span>
          </Link>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#56323E] dark:hover:bg-[#432634] dark:text-[#FAF5EF] dark:border dark:border-white/10 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#351D28] p-5 rounded-2xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#A68B98] mb-1">
            <span>Total Invoiced Value</span>
            <FileText className="w-4 h-4 text-[#56323E] dark:text-[#EFDFD2]" />
          </div>
          <div className="text-2xl font-black text-[#2D1822] dark:text-white">₹{metrics.totalBilled}</div>
          <div className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1">
            Across {metrics.totalInvoices} invoices
          </div>
        </div>

        <div className="bg-white dark:bg-[#351D28] p-5 rounded-2xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#A68B98] mb-1">
            <span>PayPal Settled</span>
            <CreditCard className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-[#2D1822] dark:text-[#FAF5EF] font-enterprise-mono">₹{metrics.totalBilled}</div>
          <div className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1">
            Pre-authorized & captured digital receipts
          </div>
        </div>

        <div className="bg-white dark:bg-[#351D28] p-5 rounded-2xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#A68B98] mb-1">
            <span>PayPal Invoices</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-[#2D1822] dark:text-[#FAF5EF] font-enterprise-mono">{metrics.totalInvoices}</div>
          <div className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1">
            Official PayPal digital tax receipts
          </div>
        </div>

        <div className="bg-white dark:bg-[#351D28] p-5 rounded-2xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#A68B98] mb-1">
            <span>Completed Orders</span>
            <BadgeCheck className="w-4 h-4 text-[#56323E] dark:text-[#EFDFD2]" />
          </div>
          <div className="text-2xl font-black text-[#2D1822] dark:text-[#FAF5EF]">
            {metrics.completedCount} / {metrics.totalInvoices}
          </div>
          <div className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1">
            Fully fulfilled & invoiced
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#351D28] rounded-2xl p-4 border border-[#E7DBCF] dark:border-white/10 enterprise-card shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A68B98] w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Order ID, Customer, PayPal ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-[#FAF5EF] dark:bg-[#3F2231] border border-[#E7DBCF] dark:border-white/[0.08] rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-[#56323E]/20 text-[#2D1822] dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-[#FAF5EF] dark:bg-[#2D1822] p-1 rounded-xl border border-[#E7DBCF] dark:border-white/10 text-xs">
            {['ALL', 'TODAY', 'WEEK', 'MONTH'].map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  dateFilter === d
                    ? 'bg-[#56323E] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:text-[#2D1822] shadow-sm font-bold'
                    : 'text-[#7D6671] dark:text-[#C5B0BA] hover:text-[#2D1822]'
                }`}
              >
                {d === 'ALL' ? 'All Time' : d === 'TODAY' ? 'Today' : d === 'WEEK' ? '7 Days' : 'This Month'}
              </button>
            ))}
          </div>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-[#FAF5EF] dark:bg-[#3F2231] border border-[#E7DBCF] dark:border-white/[0.08] rounded-xl text-xs font-bold text-[#5E4752] dark:text-[#C5B0BA] outline-none"
            aria-label="Filter by payment method"
          >
            <option value="ALL">All PayPal Orders</option>
            <option value="PAYPAL">PayPal Digital Settlement</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#FAF5EF] dark:bg-[#3F2231] border border-[#E7DBCF] dark:border-white/[0.08] rounded-xl text-xs font-bold text-[#5E4752] dark:text-[#C5B0BA] outline-none"
            aria-label="Filter by order status"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="ACTIVE">Active (In Progress)</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchOrders()}
            className="p-2 bg-[#FAF5EF] dark:bg-[#351D28] hover:bg-[#EFDFD2] dark:hover:bg-[#432634] border border-[#E7DBCF] dark:border-white/10 rounded-xl text-[#56323E] dark:text-[#FAF5EF] transition-colors cursor-pointer"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white dark:bg-[#351D28] rounded-2xl border border-[#E7DBCF] dark:border-white/10 enterprise-card shadow-sm overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-12 text-center text-[#A68B98] text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#56323E]" />
            <span>Loading store invoices...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-[#7D6671]">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <h3 className="font-bold text-[#2D1822] dark:text-white">No invoices matching filters</h3>
            <p className="text-xs text-[#A68B98] mt-1">Try clearing your search query or changing date range filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF5EF] dark:bg-[#3F2231]/60 text-[#7D6671] dark:text-[#C5B0BA] uppercase tracking-wider font-extrabold border-b border-[#E7DBCF] dark:border-white/[0.08]">
                <tr>
                  <th className="px-6 py-3.5">Invoice # / Order</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Payment Method</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7DBCF] dark:divide-white/[0.08]">
                {filteredOrders.map((order) => {
                  const method = (order.payment_method || 'COD').toUpperCase();
                  return (
                    <tr 
                      key={order.id}
                      className="hover:bg-[#FAF5EF]/60 dark:hover:bg-[#3F2231]/40 transition-colors group"
                    >
                      {/* Order / Invoice ID */}
                      <td className="px-6 py-4">
                        <div className="font-black text-[#2D1822] dark:text-white text-sm group-hover:text-[#56323E] transition-colors">
                          #{order.id}
                        </div>
                        <div className="text-[11px] text-[#A68B98] font-mono mt-0.5">
                          {order.order_type || 'PICKUP'}
                          {order.delivery_slot_label && ` • ${order.delivery_slot_label}`}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#2D1822] dark:text-[#FAF5EF]">
                          {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-[#A68B98] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#2D1822] dark:text-white">
                          {order.customer_name || `Customer #${order.customer}`}
                        </div>
                        {order.delivery_pincode && (
                          <div className="text-[11px] text-[#A68B98]">PIN: {order.delivery_pincode}</div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            <CreditCard className="w-3 h-3" />
                            <span>PayPal</span>
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          order.status === 'READY' ? 'bg-[#EAF2EC] text-[#2F5238] border border-[#CFDFD3] dark:bg-[#2D4536]/40 dark:text-[#A8D5B5]' :
                          order.status === 'PREPARING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                          order.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                          'bg-[#F5ECE1] text-[#56323E] border border-[#E7DBCF] dark:bg-[#3F2231] dark:text-[#EFDFD2] dark:border-white/10'
                        }`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-right">
                        <div className="font-extrabold text-sm text-[#2D1822] dark:text-white">
                          ₹{order.total_amount}
                        </div>
                        {order.wallet_discount && parseFloat(order.wallet_discount) > 0 && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            -₹{order.wallet_discount} wallet
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceOrderId(order.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#56323E]/10 dark:bg-white/[0.08] text-[#56323E] dark:text-[#EFDFD2] border border-[#56323E]/20 dark:border-white/10 hover:bg-[#56323E]/20 font-bold transition-all shadow-sm cursor-pointer"
                            title="Open & Print Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print</span>
                          </button>

                          <Link
                            to={`/owner/orders/${order.id}`}
                            className="p-1.5 rounded-lg text-[#A68B98] hover:text-[#5E4752] dark:hover:text-white hover:bg-[#F2E9E0] dark:hover:bg-[#3F2231] transition-colors"
                            title="Manage Order"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tax Invoice Modal Popup */}
      {selectedInvoiceOrderId && (
        <InvoiceModal
          orderId={selectedInvoiceOrderId}
          onClose={() => setSelectedInvoiceOrderId(null)}
        />
      )}
    </div>
  );
};

export default Invoices;
