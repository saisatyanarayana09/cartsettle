import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
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
  AlertTriangle,
  FileText,
  ExternalLink,
  Truck,
  Send
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

  // Filter rows based on quick filter and status dropdown
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

      toast.success(`PayPal Invoicing v2 invoice created!`);
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
      NEW: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
      PREPARING: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      READY: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      COMPLETED: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      REJECTED: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.NEW}`}>
        {status}
      </span>
    );
  }, []);

  // PayPal Settlement Status Renderer
  const PayPalSettlementRenderer = useCallback((params) => {
    const order = params.data;
    if (!order) return null;

    if (order.paypal_capture_id) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5" />
          Captured (${parseFloat(order.captured_amount || order.total_amount).toFixed(2)})
        </span>
      );
    }
    if (order.paypal_authorization_id) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          Hold: ${parseFloat(order.authorized_amount || order.total_amount).toFixed(2)}
        </span>
      );
    }
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
        {order.payment_method || 'COD'}
      </span>
    );
  }, []);

  // Auto-Released Refund Renderer
  const ReleasedRefundRenderer = useCallback((params) => {
    const released = parseFloat(params.value || 0);
    if (released > 0) {
      return (
        <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
          -${released.toFixed(2)} Released
        </span>
      );
    }
    return <span className="text-xs text-slate-400 dark:text-slate-600">-</span>;
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
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded border border-indigo-200 dark:border-indigo-800 transition-all"
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
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
          <span>Send Inv v2</span>
        </button>
      );
    }

    return <span className="text-xs text-slate-400 font-mono">-</span>;
  }, [actionLoadingId]);

  // Shipping Tracking Cell Renderer
  const TrackingRenderer = useCallback((params) => {
    const order = params.data;
    if (!order) return null;

    if (order.paypal_tracking_number) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[140px]" title={order.paypal_tracking_number}>
          <Truck className="w-3 h-3 text-indigo-500 shrink-0" />
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

    return <span className="text-xs text-slate-400">-</span>;
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
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-linear-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 rounded-lg shadow-xs transition-all cursor-pointer"
            title="Open Packing Table for Dynamic Settlement"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            Settle Pack
          </button>
        ) : (
          <button
            onClick={() => onViewDetails && onViewDetails(order)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
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
      width: 140,
      pinned: 'left',
      cellRenderer: (p) => (
        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
          #{p.value}
        </span>
      ),
      sortable: true,
      filter: true
    },
    {
      headerName: 'Customer',
      field: 'customer_name',
      width: 160,
      cellRenderer: (p) => (
        <div className="leading-tight py-1">
          <div className="font-medium text-slate-900 dark:text-slate-100 text-xs truncate">
            {p.value || 'Shopper'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {p.data?.customer_phone || p.data?.customer_email || ''}
          </div>
        </div>
      ),
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
      width: 175,
      cellRenderer: PayPalSettlementRenderer,
      sortable: true
    },
    {
      headerName: 'Total ($)',
      field: 'total_amount',
      width: 105,
      cellRenderer: (p) => (
        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
          ${parseFloat(p.value || 0).toFixed(2)}
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
      width: 130,
      cellRenderer: (p) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
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
          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders, customers, IDs..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-64 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Status Segment Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Orders ({orders.length})</option>
            <option value="PAYPAL_PENDING">⚡ Ready for Packing Settlement</option>
            <option value="INVOICED">📄 PayPal Invoiced v2</option>
            <option value="DISPATCHED">🚚 Dispatched & Tracked</option>
            <option value="NEW">New</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="ag-theme-quartz w-full flex-1" style={{ height: '560px' }}>
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
            <div className="text-center p-6 text-slate-400">
              No matching orders found.
            </div>
          )}
        />
      </div>
    </div>
  );
}
