import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from '../../router';
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  X,
  AlertCircle
} from 'lucide-react';
import api, { getUserCacheSync, setUserCache } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

const PAGE_SIZE = 5;

export default function OrdersHistory() {
  const [cachedOrders] = useState(() => {
    const cached = getUserCacheSync('/orders/');
    const rows = cached?.results ?? cached;
    return Array.isArray(rows) ? rows : null;
  });
  const [orders, setOrders] = useState(cachedOrders || []);
  const [loading, setLoading] = useState(!cachedOrders);
  const [error, setError] = useState('');

  // Search, Month Filter & Pagination (5 orders per page)
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      return params.get('q') || '';
    }
    return '';
  });
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchOrders = useCallback(
    (silent = false) => {
      if (!silent && !cachedOrders) setLoading(true);
      setError('');
      api
        .get('/orders/')
        .then((res) => {
          const orderList = res.data?.results ?? res.data;
          if (!Array.isArray(orderList)) throw new Error('Invalid orders response');
          setOrders(orderList);
          setUserCache('/orders/', orderList);
        })
        .catch(() => {
          if (!cachedOrders) setOrders([]);
          setError('Could not load your orders.');
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [cachedOrders]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const activeOrder = orders.find((o) =>
    ['PENDING', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(
      String(o?.status || '').toUpperCase()
    )
  );

  const handleWsMessage = useCallback(
    (data) => {
      if (!data || !data.type) return;
      if (data.type === 'ORDER_STATUS_UPDATE') {
        fetchOrders(true);
      }
    },
    [fetchOrders]
  );

  useWebSocket({
    path: activeOrder ? `/ws/orders/${activeOrder.id}/tracking/` : '',
    enabled: Boolean(activeOrder),
    onMessage: handleWsMessage
  });

  // Build available Month options (from existing orders + current year months)
  const monthOptions = useMemo(() => {
    const map = new Map();
    const now = new Date();
    const currentYear = now.getFullYear();

    // Add months from user's orders first
    orders.forEach((order) => {
      if (!order?.created_at) return;
      const d = new Date(order.created_at);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      map.set(key, label);
    });

    // Also ensure all 12 months of the current year are selectable
    for (let m = 0; m < 12; m++) {
      const d = new Date(currentYear, m, 1);
      const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, [orders]);

  // Filter orders by Search Query + Month Filter
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (selectedMonth !== 'ALL' && order?.created_at) {
        const d = new Date(order.created_at);
        if (!isNaN(d.getTime())) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (monthKey !== selectedMonth) return false;
        }
      }

      if (!q) return true;

      const idMatch = String(order?.id || '')
        .toLowerCase()
        .includes(q);
      const statusMatch = String(order?.status || '')
        .toLowerCase()
        .includes(q);
      const typeMatch = String(order?.order_type || '')
        .toLowerCase()
        .includes(q);
      const itemsMatch = Array.isArray(order?.items)
        ? order.items.some((it) =>
            String(it?.product_name_snapshot || it?.product_name || '')
              .toLowerCase()
              .includes(q)
          )
        : false;

      return idMatch || statusMatch || typeMatch || itemsMatch;
    });
  }, [orders, searchQuery, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedOrders = filteredOrders.slice(startIdx, startIdx + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMonth]);

  const getStatusStyle = (status) => {
    switch (String(status || '').toUpperCase()) {
      case 'COMPLETED':
        return 'bg-[#34C759]/15 text-[#34C759] dark:text-[#30D158]';
      case 'REJECTED':
        return 'bg-rose-500/12 text-rose-600 dark:text-rose-400';
      case 'READY':
      case 'OUT_FOR_DELIVERY':
        return 'bg-[#0071E3]/12 text-[#0071E3] dark:text-[#0A84FF]';
      case 'PREPARING':
      case 'ACCEPTED':
      case 'NEW':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#86868B]';
    }
  };

  return (
    <div className="mx-auto max-w-4xl text-[#1D1D1F] dark:text-[#F5F5F7] antialiased flex flex-col justify-between">
      {/* Compact Single-Row Apple HIG Header + Search Bar + Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-[#E5E5EA] dark:border-[#38383A]">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <Link
            to="/profile"
            className="inline-flex items-center gap-0.5 -ml-1.5 px-2 py-1 rounded-[10px] text-[#0071E3] dark:text-[#0A84FF] hover:bg-[#0071E3]/10 font-semibold text-[13px] transition-all active:scale-95"
          >
            <ChevronLeft size={17} className="stroke-[2.4]" />
            <span>Profile</span>
          </Link>

          <div className="flex items-center gap-2">
            <h1 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
              Orders
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#E8E8ED] dark:bg-[#2C2C2E] text-[11px] font-semibold text-[#86868B] tabular-nums">
              {filteredOrders.length}
            </span>
          </div>
        </div>

        {/* Apple HIG Search Input + Month Filter Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, item, status..."
              aria-label="Search orders"
              className="w-full h-8 pl-8 pr-7 text-xs rounded-[10px] bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Month Filter Dropdown */}
          <div className="relative shrink-0">
            <Calendar
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0071E3] dark:text-[#0A84FF] pointer-events-none"
            />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Filter by month"
              className="h-8 pl-7 pr-6 text-xs font-semibold rounded-[10px] bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:border-[#0071E3] cursor-pointer"
            >
              <option value="ALL">All Months</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert Banner (Preserves OrdersHistory.test.tsx retry assertion) */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-[16px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 px-4 py-3 mb-3 text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchOrders()}
            className="px-3 py-1.5 rounded-[10px] bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] text-xs font-semibold cursor-pointer shrink-0"
          >
            Try again
          </button>
        </div>
      )}

      {/* Main Content Area: Fits 5 Orders on Screen Without Scroll */}
      {loading ? (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] overflow-hidden divide-y divide-[#E5E5EA] dark:divide-[#38383A] border border-black/[0.03] dark:border-white/[0.06]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[60px] px-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-[12px] bg-[#F5F5F7] dark:bg-[#2C2C2E]" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 rounded bg-[#F5F5F7] dark:bg-[#2C2C2E]" />
                  <div className="h-2.5 w-40 rounded bg-[#F5F5F7] dark:bg-[#2C2C2E]" />
                </div>
              </div>
              <div className="h-4 w-16 rounded bg-[#F5F5F7] dark:bg-[#2C2C2E]" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 && error ? null : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] py-12 px-6 text-center shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06]">
          <div className="size-12 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-[14px] flex items-center justify-center text-[#86868B] mx-auto mb-3">
            <Package size={22} />
          </div>
          <h3 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            {orders.length === 0 ? 'No orders yet' : 'No matching orders'}
          </h3>
          <p className="text-xs text-[#86868B] mt-1 mb-5 max-w-xs mx-auto leading-relaxed">
            {orders.length === 0
              ? 'Once you place an order, it will appear here for real-time tracking.'
              : 'Try adjusting your search keywords or selecting All Months.'}
          </p>
          {orders.length === 0 ? (
            <Link
              to="/products"
              className="h-9 px-5 rounded-[12px] bg-[#1D1D1F] hover:bg-black/85 dark:bg-white dark:hover:bg-white/90 text-white dark:text-[#1D1D1F] text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-95"
            >
              Start Shopping <ChevronRight size={14} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedMonth('ALL');
              }}
              className="h-9 px-4 rounded-[12px] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#0071E3] dark:text-[#0A84FF] text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Unified Apple HIG Inset Grouped Sheet (5 Compact Order Rows) */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[22px] shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.06] overflow-hidden divide-y divide-[#E5E5EA] dark:divide-[#38383A]">
            {paginatedOrders.map((order) => {
              const itemCount = order.items?.length || 0;
              const firstItem = order.items?.[0];
              const firstImg = firstItem?.product_image;
              const itemPreview = Array.isArray(order.items) && order.items.length > 0
                ? order.items
                    .slice(0, 2)
                    .map((i) => i.product_name_snapshot || i.product_name || 'Item')
                    .join(', ') + (order.items.length > 2 ? ` +${order.items.length - 2}` : '')
                : `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
              const formattedDate = order.created_at
                ? new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '';

              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="group h-[62px] px-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F5F5F7]/60 dark:hover:bg-[#2C2C2E]/50 transition-colors"
                >
                  {/* Left: Squircle Thumbnail + Order ID & Subtitle */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="size-10 rounded-[11px] bg-[#F5F5F7] dark:bg-[#2C2C2E] shrink-0 overflow-hidden flex items-center justify-center p-1">
                      {firstImg ? (
                        <img
                          src={firstImg}
                          alt=""
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <Package size={17} className="text-[#86868B]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] sm:text-[14px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors truncate">
                          {order.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0 ${getStatusStyle(
                            order.status
                          )}`}
                        >
                          {String(order.status || 'NEW').replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#86868B] truncate mt-0.5">
                        {formattedDate}
                        {itemPreview ? ` · ${itemPreview}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Right: Total Amount + Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                        ₹{parseFloat(order.total_amount || 0).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-[#86868B] tabular-nums">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-[#86868B] group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Compact Apple HIG Pagination Bar (5 Orders per Page) */}
          <div className="mt-2.5 px-1 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] font-medium text-[#86868B] tabular-nums">
              Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filteredOrders.length)} of{' '}
              {filteredOrders.length}
            </span>

            {totalPages > 1 && (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  aria-label="Previous page"
                  className="h-7 px-2.5 rounded-[9px] bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-[11px] disabled:opacity-40 cursor-pointer transition-all"
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter(
                    (pageNum) =>
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - safePage) <= 1
                  )
                  .reduce((acc, pageNum, idx, arr) => {
                    if (idx > 0 && pageNum - arr[idx - 1] > 1) {
                      acc.push('ellipsis-' + pageNum);
                    }
                    acc.push(pageNum);
                    return acc;
                  }, [])
                  .map((item) =>
                    typeof item === 'string' ? (
                      <span key={item} className="px-1 text-[#86868B] text-[11px]">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        aria-label={`Page ${item}`}
                        aria-current={safePage === item ? 'page' : undefined}
                        className={`size-7 rounded-[9px] text-[11px] font-semibold tabular-nums cursor-pointer transition-all ${
                          safePage === item
                            ? 'bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F]'
                            : 'bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A] text-[#86868B] hover:text-[#1D1D1F]'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  aria-label="Next page"
                  className="h-7 px-2.5 rounded-[9px] bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-[#F5F5F7] font-semibold text-[11px] disabled:opacity-40 cursor-pointer transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
