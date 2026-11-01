import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Download, TrendingUp, ShoppingCart, IndianRupee, Trophy, Calendar } from 'lucide-react';
import api from '../../services/api';

export default function Sales() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30'); // '7', '30', 'all'

  useEffect(() => {
    // Fetch as many orders as possible for analytics
    api.get('/orders/?limit=2000')
      .then(res => setOrders(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const { filteredOrders, totalSales, totalOrders, aov, chartData, topProducts } = useMemo(() => {
    // 1. Filter by timeframe
    const now = new Date();
    const cutoff = new Date();
    if (timeframe !== 'all') {
      cutoff.setDate(now.getDate() - parseInt(timeframe));
    }
    
    // Only count completed/delivered orders
    const validOrders = orders.filter(o => 
      o.status === 'COMPLETED' && 
      (timeframe === 'all' || new Date(o.created_at) >= cutoff)
    );

    // 2. Aggregate Metrics
    const totalSales = validOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalOrders = validOrders.length;
    const aov = totalOrders > 0 ? (totalSales / totalOrders) : 0;

    // 3. Generate Daily Chart Data
    const dailyMap = {};
    validOrders.forEach(o => {
      const dateStr = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + parseFloat(o.total_amount || 0);
    });
    
    // Sort chronologically (assuming keys are relatively recent)
    // Actually better to iterate over the past X days explicitly if it's 7 or 30 days
    let chartData = [];
    if (timeframe !== 'all') {
        const days = parseInt(timeframe);
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            chartData.push({
                date: dateStr,
                sales: dailyMap[dateStr] || 0
            });
        }
    } else {
        // Just use the map sorted by actual date
        chartData = Object.entries(dailyMap).map(([date, sales]) => ({ date, sales }));
        // Sorting is tricky with just 'Oct 1', so we rely on natural order or skip complex sorting for 'all'
    }

    // 4. Calculate Best Sellers
    const productMap = {};
    validOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const pId = item.product;
        const pName = item.product_name_snapshot;
        if (!productMap[pId]) {
          productMap[pId] = { name: pName, quantity: 0, revenue: 0 };
        }
        productMap[pId].quantity += item.quantity;
        productMap[pId].revenue += parseFloat(item.subtotal || 0);
      });
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return { filteredOrders: validOrders, totalSales, totalOrders, aov, chartData, topProducts };
  }, [orders, timeframe]);

  const handleDownloadCSV = () => {
    // Generate simple CSV
    let csv = 'Order ID,Date,Customer,Items,Total Amount\n';
    filteredOrders.forEach(o => {
      const date = new Date(o.created_at).toLocaleDateString();
      const customer = o.customer_name || 'Guest';
      csv += `${o.id},${date},${customer},${o.items_count},${o.total_amount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `sales_report_${timeframe}_days.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-slate-500 dark:text-slate-400 text-center font-medium">
        Loading sales data...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-[#0d1322] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={32} />
            Sales Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your store's performance and top selling items.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex">
            <button onClick={() => setTimeframe('7')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${timeframe === '7' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>7 Days</button>
            <button onClick={() => setTimeframe('30')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${timeframe === '30' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>30 Days</button>
            <button onClick={() => setTimeframe('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${timeframe === 'all' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>All Time</button>
          </div>
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold transition-colors shadow-sm text-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#0d1322] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400"><IndianRupee size={28} /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Gross Revenue</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">₹{totalSales.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#0d1322] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400"><ShoppingCart size={28} /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Completed Orders</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{totalOrders}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#0d1322] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 transition-colors">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400"><Trophy size={28} /></div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Average Order Value</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">₹{aov.toFixed(0)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#0d1322] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Calendar className="text-emerald-500" size={20} /> Revenue Trend
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 15, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-10" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip 
                  cursor={{ fill: 'transparent' }} 
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)', fontWeight: 'bold' }} 
                />
                <Bar dataKey="sales" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0d1322] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="text-amber-500" size={20} /> Best Sellers
          </h2>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">No sales data found for this period.</p>
            ) : (
              topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black flex-shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : idx === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                      #{idx + 1}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{product.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{product.quantity} units sold</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{product.revenue.toFixed(0)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
