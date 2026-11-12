import React, { useMemo, useRef, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  PackageCheck, 
  ArrowRight, 
  RefreshCw,
  Clock,
  CheckCircle,
  FileText,
  ExternalLink,
  Truck,
  Send,
  Copy,
  TrendingUp,
  Layers,
  Banknote,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Register AG Grid Community Modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function OwnerOrdersAgGrid({
  orders = [],
  loading = false,
  onRefresh,
  onOpenSettlement,
  onViewDetails
}) {
  const gridRef = useRef(null);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Compute Live Operational KPIs
  const stats = useMemo(() => {
    let totalVolume = 0;
    let holdVolume = 0;
    let pendingPackCount = 0;
    let activeQueueCount = 0;
    let completedCount = 0;
    let newCount = 0;
    let prepCount = 0;
    let readyCount = 0;
    let invoicedCount = 0;
    let dispatchedCount = 0;

    orders.forEach((o) => {
      const amt = parseFloat(o.total_amount || 0);
      totalVolume += amt;
      if (o.paypal_authorization_id && !o.paypal_capture_id && o.status !== 'REJECTED') {
        holdVolume += parseFloat(o.authorized_amount || o.total_amount || 0);
        pendingPackCount += 1;
      }
      if (['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)) {
        activeQueueCount += 1;
      }
      if (o.status === 'NEW') newCount += 1;
      if (o.status === 'PREPARING') prepCount += 1;
      if (o.status === 'READY') readyCount += 1;
      if (o.status === 'COMPLETED') completedCount += 1;
      if (o.paypal_invoice_url || o.paypal_invoice_id) invoicedCount += 1;
      if (o.paypal_tracking_number) dispatchedCount += 1;
    });

    return {
      totalVolume,
      totalOrders: orders.length,
      holdVolume,
      pendingPackCount,
      activeQueueCount,
      completedCount,
      newCount,
      prepCount,
      readyCount,
      invoicedCount,
      dispatchedCount
    };
  }, [orders]);

  // Filter rows based on quick filter and status selection
  const filteredData = useMemo(() => {
    if (!orders) return [];
    if (statusFilter === 'ALL') return orders;
    if (statusFilter === 'PAYPAL_PENDING') {
      return orders.filter(o => o.paypal_authorization_id && !o.paypal_capture_id);
    }
    if (statusFilter === 'INVOICED') {
      return orders.filter(o => o.paypal_invoice_url || o.paypal_invoice_id);
    }
    if (statusFilter === 'DISPATCHED') {
      return orders.filter(o => o.paypal_tracking_number);
    }
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  // Handle generating PayPal Invoice on demand
  const handleGenerateInvoice = async (orderId) => {
    try {
      setActionLoadingId(orderId);
      const res = await api.post(`/orders/${orderId}/generate_invoice/`, {});

      toast.success('PayPal Invoicing v2 invoice created!');
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.applyTransaction({ update: [res.data.order] });
        gridRef.current.api.flashCells({
          rowNodes: [gridRef.current.api.getRowNode(orderId)]
        });
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Invoice error:', err);
      toast.error(err.response?.data?.detail || 'Failed to generate PayPal invoice.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Dispatch & Shipping Tracker on demand
  const handleDispatchTracking = async (orderId) => {
    try {
      setActionLoadingId(orderId);
      const res = await api.post(`/orders/${orderId}/dispatch_tracking/`, { carrier: 'CartSettle Express' });

      toast.success(`Order #${orderId} dispatched with PayPal tracking!`);
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.applyTransaction({ update: [res.data.order] });
        gridRef.current.api.flashCells({
          rowNodes: [gridRef.current.api.getRowNode(orderId)]
        });
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Tracking dispatch error:', err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch tracking.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Status Badge Cell Renderer
  const StatusCellRenderer = useCallback((params) => {
    const status = params.value;
    const styles = {
      NEW: 'bg-[#FAF5EF] text-[#56323E] border-[#E7DBCF] dark:bg-[#432634] dark:text-[#FAF5EF] dark:border-white/10',
      ACCEPTED: 'bg-[#F2E6DA] text-[#56323E] border-[#E7DBCF] dark:bg-[#3F2231] dark:text-[#EFDFD2] dark:border-white/10',
      PREPARING: 'bg-[#FDF2EC] text-[#8C4A2B] border-[#F2DACD] dark:bg-[#4D2E24]/50 dark:text-[#E8B5A2] dark:border-[#6D4336]/60',
      READY: 'bg-[#EAF2EC] text-[#2F5238] border-[#CFDFD3] dark:bg-[#2D4536]/40 dark:text-[#A8D5B5] dark:border-[#3F634D]/50',
      OUT_FOR_DELIVERY: 'bg-[#F5ECE1] text-[#56323E] border-[#E7DBCF] dark:bg-[#3F2231] dark:text-[#EFDFD2] dark:border-white/10',
      COMPLETED: 'bg-[#FAF5EF] text-[#7D6671] border-[#E7DBCF] dark:bg-[#351D28] dark:text-[#C5B0BA] dark:border-white/10',
      REJECTED: 'bg-[#FDF0F2] text-[#8E283E] border-[#F6D0D8] dark:bg-[#4A1A26]/40 dark:text-[#EFA3B2] dark:border-[#6B2838]/50',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.NEW}`}>
        {status}
      </span>
    );
  }, []);

  // PayPal Settlement Status Renderer (INR ₹)
  const PayPalSettlementRenderer = useCallback((params) => {
    const order = params.data;
    if (!order) return null;

    if (order.paypal_capture_id || ['READY', 'OUT_FOR_DELIVERY', 'COMPLETED'].includes(order.status)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5" />
          Captured (₹{parseFloat(order.captured_amount || order.total_amount).toFixed(2)})
        </span>
      );
    }
    if (order.paypal_authorization_id) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          Hold: ₹{parseFloat(order.authorized_amount || order.total_amount).toFixed(2)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
        PayPal
      </span>
    );
  }, []);

  // Auto-Released Refund Renderer (INR ₹)
  const ReleasedRefundRenderer = useCallback((params) => {
    const released = parseFloat(params.value || 0);
    if (released > 0) {
      return (
        <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
          -₹{released.toFixed(2)} Released
        </span>
      );
    }
    return <span className="text-xs text-[#A68B98] dark:text-[#A68B98]">-</span>;
  }, []);

  // PayPal Invoicing v2 Cell Renderer
  const PayPalInvoiceRenderer = useCallback((params) => {
    const order = params.data;
    if (!order) return null;

    if (order.paypal_invoice_url) {
      return (
        <a
          href={order.paypal_invoice_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-[#56323E] dark:text-[#EFDFD2] bg-[#56323E]/10 dark:bg-[#EFDFD2]/10 rounded border border-[#56323E]/20 dark:border-white/10 transition-all hover:opacity-85"
          title="Open Official PayPal Invoice in new tab"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Invoice</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    }

    if (order.paypal_capture_id || order.status === 'READY' || order.status === 'COMPLETED') {
      const isGenerating = actionLoadingId === order.id;
      return (
        <button
          onClick={() => handleGenerateInvoice(order.id)}
          disabled={isGenerating}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-[#56323E] dark:text-[#EFDFD2] bg-[#FAF5EF] hover:bg-[#EFDFD2] dark:bg-[#3F2231] dark:hover:bg-[#432634] rounded border border-[#E7DBCF] dark:border-white/10 transition-all cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
          <span>Send Inv v2</span>
        </button>
      );
    }

    return <span className="text-xs text-[#A68B98] font-mono">-</span>;
  }, [actionLoadingId]);

  // Shipping Tracking Cell Renderer
  const TrackingRenderer = useCallback((params) => {
    const order = params.data;
    if (!order) return null;

    if (order.paypal_tracking_number) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium text-[#5E4752] dark:text-[#C5B0BA] bg-[#F2E9E0] dark:bg-[#3F2231] rounded border border-[#E7DBCF] dark:border-white/[0.08] truncate max-w-[140px]" title={order.paypal_tracking_number}>
          <Truck className="w-3 h-3 text-[#56323E] dark:text-[#EFDFD2] shrink-0" />
          <span className="truncate">{order.paypal_tracking_number}</span>
        </span>
      );
    }

    if (order.status === 'READY') {
      const isDispatching = actionLoadingId === order.id;
      return (
        <button
          onClick={() => handleDispatchTracking(order.id)}
          disabled={isDispatching}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer disabled:opacity-50"
        >
          {isDispatching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          <span>Dispatch</span>
        </button>
      );
    }

    return <span className="text-xs text-[#A68B98]">-</span>;
  }, [actionLoadingId]);

  // Actions Cell Renderer
  const ActionsCellRenderer = useCallback((params) => {
    const order = params.data;
    if (!order) return null;

    const needsSettlement = order.paypal_authorization_id && !order.paypal_capture_id && order.status !== 'REJECTED';

    return (
      <div className="flex items-center gap-1.5 h-full">
        {needsSettlement ? (
          <button
            onClick={() => onOpenSettlement && onOpenSettlement(order)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#FAF5EF] bg-[#56323E] hover:bg-[#432634] dark:bg-[#EFDFD2] dark:hover:bg-[#E7DBCF] dark:text-[#2D1822] rounded-lg shadow-xs transition-all cursor-pointer"
            title="Open Packing Table for Dynamic Settlement"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            Settle Pack
          </button>
        ) : (
          <button
            onClick={() => onViewDetails && onViewDetails(order)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#56323E] dark:text-[#EFDFD2] bg-[#FAF5EF] hover:bg-[#EFDFD2] dark:bg-[#3F2231] dark:hover:bg-[#432634] border border-[#E7DBCF] dark:border-white/10 rounded-lg transition-all cursor-pointer"
          >
            View <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }, [onOpenSettlement, onViewDetails]);

  // Column Definitions for AG Grid
  const columnDefs = useMemo(() => [
    {
      headerName: 'Order #',
      field: 'id',
      width: 150,
      pinned: 'left',
      cellRenderer: (p) => {
        const orderId = String(p.value || '');
        return (
          <div className="flex items-center gap-1.5 group py-1">
            <span className="font-mono font-bold text-[#56323E] dark:text-[#EFDFD2] text-xs">
              #{orderId}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(orderId);
                toast.success(`Order #${orderId} copied!`);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-[#A68B98] hover:text-[#56323E] dark:hover:text-[#EFDFD2] transition-opacity cursor-pointer"
              title="Copy Order ID"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        );
      },
      sortable: true,
      filter: true
    },
    {
      headerName: 'Customer',
      field: 'customer_name',
      width: 180,
      cellRenderer: (p) => {
        const name = p.value || 'Shopper';
        const initials = name
          .split(' ')
          .map(n => n[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'S';

        return (
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-7 h-7 rounded-full bg-[#EFDFD2] dark:bg-[#432634] text-[#56323E] dark:text-[#EFDFD2] font-bold text-[11px] flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="leading-tight truncate">
              <div className="font-semibold text-[#2D1822] dark:text-[#FAF5EF] text-xs truncate">
                {name}
              </div>
              <div className="text-[11px] text-[#7D6671] dark:text-[#C5B0BA] font-mono truncate">
                {p.data?.customer_phone || p.data?.customer_email || 'Direct Order'}
              </div>
            </div>
          </div>
        );
      },
      sortable: true,
      filter: true
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 130,
      cellRenderer: StatusCellRenderer,
      sortable: true,
      filter: true
    },
    {
      headerName: 'PayPal Settlement',
      field: 'paypal_authorization_id',
      width: 180,
      cellRenderer: PayPalSettlementRenderer,
      sortable: true
    },
    {
      headerName: 'Total (₹)',
      field: 'total_amount',
      width: 110,
      cellRenderer: (p) => (
        <span className="font-semibold text-xs text-[#2D1822] dark:text-[#FAF5EF]">
          ₹{parseFloat(p.value || 0).toFixed(2)}
        </span>
      ),
      sortable: true
    },
    {
      headerName: 'Auto-Released',
      field: 'released_amount',
      width: 135,
      cellRenderer: ReleasedRefundRenderer,
      sortable: true
    },
    {
      headerName: 'PayPal Invoice',
      field: 'paypal_invoice_url',
      width: 135,
      cellRenderer: PayPalInvoiceRenderer,
      sortable: false
    },
    {
      headerName: 'Shipping / Tracker',
      field: 'paypal_tracking_number',
      width: 145,
      cellRenderer: TrackingRenderer,
      sortable: false
    },
    {
      headerName: 'Margin Guard',
      field: 'margin_guarded',
      width: 135,
      cellRenderer: () => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#56323E] dark:text-[#EFDFD2]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Protected (12%)
        </span>
      )
    },
    {
      headerName: 'Placed Date',
      field: 'created_at',
      width: 150,
      cellRenderer: (p) => {
        if (!p.value) return '';
        const d = new Date(p.value);
        return (
          <span className="text-xs text-[#5E4752] dark:text-[#C5B0BA] font-mono">
            {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
      sortable: true
    },
    {
      headerName: 'Action',
      width: 130,
      pinned: 'right',
      cellRenderer: ActionsCellRenderer,
      sortable: false,
      filter: false
    }
  ], [StatusCellRenderer, PayPalSettlementRenderer, ReleasedRefundRenderer, PayPalInvoiceRenderer, TrackingRenderer, ActionsCellRenderer]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true
  }), []);

  const onExportCsv = useCallback(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `cartsettle_orders_${new Date().toISOString().slice(0, 10)}.csv`
      });
    }
  }, []);

  // Filter Pill Definitions
  const filterPills = [
    { id: 'ALL', label: 'All Orders', count: stats.totalOrders },
    { id: 'PAYPAL_PENDING', label: '⚡ Settle Pack', count: stats.pendingPackCount, highlight: true },
    { id: 'NEW', label: 'New', count: stats.newCount },
    { id: 'PREPARING', label: 'Preparing', count: stats.prepCount },
    { id: 'READY', label: 'Ready', count: stats.readyCount },
    { id: 'COMPLETED', label: 'Completed', count: stats.completedCount },
    { id: 'INVOICED', label: 'Invoiced v2', count: stats.invoicedCount },
    { id: 'DISPATCHED', label: 'Dispatched', count: stats.dispatchedCount },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Operational KPI Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Volume */}
        <div className="bg-white dark:bg-[#351D28] p-4 rounded-xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#A68B98] mb-1">
            <span>Total Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-[#2D1822] dark:text-white">
            ₹{stats.totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#7D6671] dark:text-[#C5B0BA] mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Across {stats.totalOrders} total orders</span>
          </div>
        </div>

        {/* Metric 2: Total Orders */}
        <div className="bg-white dark:bg-[#351D28] p-4 rounded-xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#A68B98] mb-1">
            <span>Orders Logged</span>
            <Layers className="w-4 h-4 text-[#56323E] dark:text-[#EFDFD2]" />
          </div>
          <div className="text-xl font-bold text-[#2D1822] dark:text-white">
            {stats.totalOrders}
          </div>
          <div className="text-[11px] text-[#7D6671] dark:text-[#C5B0BA] mt-1">
            {stats.completedCount} fulfilled & completed
          </div>
        </div>

        {/* Metric 3: Hold for Settlement */}
        <div className="bg-white dark:bg-[#351D28] p-4 rounded-xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#A68B98] mb-1">
            <span>Hold For Settlement</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            ₹{stats.holdVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#7D6671] dark:text-[#C5B0BA] mt-1 font-medium">
            {stats.pendingPackCount} orders awaiting dynamic capture
          </div>
        </div>

        {/* Metric 4: In-Store Prep Queue */}
        <div className="bg-white dark:bg-[#351D28] p-4 rounded-xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#A68B98] mb-1">
            <span>Active Queue</span>
            <Sparkles className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold text-[#2D1822] dark:text-white">
            {stats.activeQueueCount}
          </div>
          <div className="text-[11px] text-[#7D6671] dark:text-[#C5B0BA] mt-1">
            Preparing ({stats.prepCount}) & Ready ({stats.readyCount})
          </div>
        </div>
      </div>

      {/* 2. AG Grid Enterprise Container */}
      <div className="flex flex-col w-full bg-white dark:bg-[#351D28] rounded-2xl border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm overflow-hidden">
        {/* Modern Filter Pill Bar */}
        <div className="px-4 py-3 border-b border-[#E7DBCF]/80 dark:border-white/[0.08] flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-[#FAF5EF]/40 dark:bg-[#2D1822]/40">
          {filterPills.map((pill) => {
            const isActive = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#56323E] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:text-[#2D1822] shadow-xs'
                    : 'text-[#7D6671] dark:text-[#C5B0BA] hover:bg-[#EFDFD2]/60 dark:hover:bg-white/5'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-[#FAF5EF]/20 text-[#FAF5EF] dark:bg-[#2D1822]/20 dark:text-[#2D1822]'
                      : pill.highlight && pill.count > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-[#EFDFD2] text-[#7D6671] dark:bg-white/10 dark:text-[#C5B0BA]'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table Toolbar */}
        <div className="p-3.5 border-b border-[#E7DBCF] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-[#FAF5EF]/60 dark:bg-[#2D1822]/60">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A68B98]" />
              <input
                type="text"
                placeholder="Search orders, customers, IDs..."
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#3F2231] border border-[#E7DBCF] dark:border-white/10 rounded-xl w-64 focus:outline-hidden focus:ring-2 focus:ring-[#56323E]/20 dark:focus:ring-[#EFDFD2]/20 text-[#2D1822] dark:text-[#FAF5EF]"
              />
            </div>

            <span className="text-xs text-[#7D6671] dark:text-[#C5B0BA] hidden sm:inline">
              Showing <strong>{filteredData.length}</strong> of {orders.length} orders
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 text-[#5E4752] dark:text-[#C5B0BA] hover:bg-[#EFDFD2] dark:hover:bg-[#3F2231] rounded-xl transition-all cursor-pointer"
                title="Refresh Orders"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#FAF5EF] dark:text-[#2D1822] bg-[#56323E] dark:bg-[#EFDFD2] hover:bg-[#432634] dark:hover:bg-[#E7DBCF] rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* AG Grid Container */}
        <div className="ag-theme-quartz dark:ag-theme-quartz-dark w-full" style={{ height: '620px', minHeight: '520px' }}>
          <AgGridReact
            ref={gridRef}
            rowData={filteredData}
            getRowId={(params) => String(params.data?.id || '')}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={15}
            paginationPageSizeSelector={[10, 15, 25, 50]}
            rowHeight={48}
            headerHeight={42}
            animateRows={true}
            loading={loading}
            noRowsOverlayComponent={() => (
              <div className="text-center p-6 text-[#A68B98]">
                No matching orders found.
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
