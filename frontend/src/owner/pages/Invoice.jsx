import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, BadgeCheck, Smartphone, CheckCircle, Clock, MapPin, Phone, Mail } from 'lucide-react';
import api from '../../services/api';

const Invoice = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isModal = searchParams.get('modal') === '1' || searchParams.get('popup') === '1';
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [invoiceHtml, setInvoiceHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const invoicePaperRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orderRes, settingsRes, invoiceRes] = await Promise.all([
          api.get(`/orders/${id}/`),
          api.get('/store/settings/').catch(() => ({ data: {} })),
          api.get(`/orders/${id}/invoice/`).catch(() => null),
        ]);
        setOrder(orderRes.data);
        setSettings(settingsRes.data);
        if (invoiceRes?.data?.html) {
          setInvoiceHtml(invoiceRes.data.html);
        }
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?redirect=${redirectUrl}`;
          return;
        }
        setError(err.response?.data?.detail || 'Failed to load invoice details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-10 px-4 font-sans bg-slate-50 dark:bg-[#090d16] transition-colors">
        <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Generating tax invoice preview...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-slate-50 dark:bg-[#090d16] transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 font-black">
            !
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Invoice Unavailable</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{error || 'Could not find this invoice.'}</p>
          <div className="flex flex-col gap-2.5">
            <Link
              to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
              className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition text-sm shadow-sm"
            >
              Sign In to View Invoice
            </Link>
            <Link
              to="/"
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition text-sm"
            >
              Return to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  // Robust Date Parsing
  const orderDateObj = new Date(order.created_at);
  const isOrderDateValid = !isNaN(orderDateObj.getTime());
  const orderDate = isOrderDateValid ? orderDateObj.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }) : 'N/A';

  const invoiceDateObj = new Date();
  const invoiceDate = invoiceDateObj.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // Professional Invoice Number Formatting
  const orderYear = isOrderDateValid ? orderDateObj.getFullYear() : invoiceDateObj.getFullYear();
  const invoiceNumber = `INV-${orderYear}-${String(order.id).padStart(5, '0')}`;

  // Dynamic Payment Method Calculation
  const getPaymentMethodDisplay = () => {
    const total = parseFloat(order.total_amount) || 0;
    const wallet = parseFloat(order.wallet_discount) || 0;
    const rawMethod = (order.payment_method || 'COD').toUpperCase();

    let methodText = 'Cash on Delivery (COD)';
    if (rawMethod === 'UPI') {
      methodText = order.upi_transaction_id 
        ? `UPI (Ref: ${order.upi_transaction_id})` 
        : 'UPI Instant Payment';
    } else if (order.order_type === 'PICKUP' && rawMethod === 'COD') {
      methodText = 'Cash at Store Counter';
    } else if (rawMethod === 'CARD') {
      methodText = 'Debit / Credit Card';
    }

    if (total === 0 && wallet > 0) {
      return 'Wallet Balance (Full)';
    }
    if (wallet > 0) {
      return `Hybrid (Wallet + ${methodText})`;
    }
    return methodText;
  };

  return (
    <div
      data-testid="invoice-page-root"
      className={`min-h-screen ${isModal ? 'p-1 sm:p-4 bg-transparent' : 'py-8 px-4 sm:px-6 bg-slate-100 dark:bg-[#090d16]'} print:bg-white print:p-0 font-sans transition-colors`}
    >
      {/* Strict Print CSS Override */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            color-scheme: light !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-paper {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Non-printable action bar - hidden if inside in-app modal popup */}
      {!isModal && (
        <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row gap-3 justify-between items-center print:hidden">
          <Link
            to={localStorage.getItem('smart-kirana-owner-token') ? `/owner/orders/${id}` : `/orders/${id}`}
            className="w-full sm:w-auto justify-center inline-flex items-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Order
          </Link>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <a
              href={`smartkirana://orders/${id}/invoice`}
              className="w-full sm:w-auto justify-center inline-flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white px-4 py-2.5 rounded-xl font-bold shadow-xs transition-colors text-xs"
            >
              <Smartphone className="w-4 h-4 mr-1.5" /> Mobile App
            </a>
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto justify-center inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow transition-all text-xs cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Download / Print PDF
            </button>
          </div>
        </div>
      )}

      {/* Printable A4 Invoice Container */}
      <div
        ref={invoicePaperRef}
        data-testid="invoice-container"
        data-invoice-paper="true"
        data-keep-white="true"
        className={`invoice-paper keep-white relative max-w-4xl mx-auto bg-white ${
          isModal ? 'p-4 sm:p-6 md:p-8 shadow-sm border border-slate-200/80 rounded-xl' : 'p-6 sm:p-8 md:p-10 shadow-xl border border-slate-200 rounded-2xl'
        } print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 text-slate-900 overflow-hidden`}
        style={{ colorScheme: 'light', backgroundColor: '#ffffff', color: '#0f172a' }}
      >
        {/* Rejected Stamp */}
        {order.status === 'REJECTED' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none opacity-30 mix-blend-multiply print:opacity-25">
            <div className="border-8 border-red-600 text-red-600 text-6xl sm:text-8xl font-black tracking-widest uppercase py-4 px-10 rounded-2xl transform -rotate-12 select-none text-center">
              CANCELLED
            </div>
          </div>
        )}

        <div className={`relative z-10 ${order.status === 'REJECTED' ? 'opacity-85' : ''}`}>
          
          {/* Top Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-5 mb-5 gap-4">
            {/* Left: Store Brand & Info */}
            <div className="space-y-1 max-w-md">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/logo.jpg" 
                  alt="Store Logo" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                  className="w-10 h-10 object-contain rounded-lg border border-slate-200 shrink-0" 
                />
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                    {settings?.store_name || "Narendra Kirana Store"}
                  </h1>
                  <p className="text-[11px] font-semibold text-emerald-700 tracking-wider uppercase">
                    Grocery & Daily Essentials
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-0.5 pt-1.5 leading-relaxed">
                {settings?.store_address && (
                  <p className="flex items-start gap-1">
                    <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <span>{settings.store_address}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                  {settings?.store_phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} className="text-slate-400" /> {settings.store_phone}
                    </span>
                  )}
                  {settings?.store_email && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} className="text-slate-400" /> {settings.store_email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Invoice Official Metadata */}
            <div className="w-full sm:w-auto text-left sm:text-right space-y-1.5">
              <div className="flex sm:flex-col items-baseline sm:items-end justify-between gap-2">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  TAX INVOICE
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Original for Recipient
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 space-y-1 sm:text-right print:bg-transparent print:p-0 print:border-none">
                <div className="flex justify-between sm:justify-end gap-x-3">
                  <span className="text-slate-500 font-medium">Invoice No:</span>
                  <span className="font-mono font-bold text-slate-900">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-x-3">
                  <span className="text-slate-500 font-medium">Invoice Date:</span>
                  <span className="font-semibold text-slate-900">{invoiceDate}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-x-3">
                  <span className="text-slate-500 font-medium">Order Reference:</span>
                  <span className="font-mono font-bold text-slate-900">#{order.id}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-x-3">
                  <span className="text-slate-500 font-medium">Order Date:</span>
                  <span className="font-semibold text-slate-900">{orderDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Strip (GSTIN & FSSAI) */}
          {(settings?.gstin || settings?.fssai_license_number) && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 mb-5 text-xs text-slate-700 print:bg-transparent print:border-slate-300">
              {settings?.gstin && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-600">GSTIN:</span>
                  <span className="font-mono font-bold text-slate-900 tracking-wider">{settings.gstin}</span>
                </div>
              )}
              {settings?.fssai_license_number && (
                <div className="flex items-center gap-1.5">
                  <BadgeCheck size={14} className="text-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-600">FSSAI Lic. No:</span>
                  <span className="font-mono font-bold text-slate-900 tracking-wider">{settings.fssai_license_number}</span>
                  <span className="text-[9px] uppercase font-extrabold bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">Govt Reg.</span>
                </div>
              )}
              <div className="text-[11px] text-slate-500">
                Place of Supply: <span className="font-semibold text-slate-800">State Code (09)</span>
              </div>
            </div>
          )}

          {/* Customer & Fulfillment Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs">
            {/* Billed / Shipped To */}
            <div 
              className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs print:border-slate-300"
              style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-1.5" style={{ color: '#94a3b8', borderColor: '#f1f5f9' }}>
                Billed / Shipped To
              </p>
              <p className="text-sm font-black text-slate-900" style={{ color: '#0f172a' }}>
                {order.customer_name || `Customer ID: ${order.customer}`}
              </p>
              {order.customer_phone && (
                <p className="text-slate-600 flex items-center gap-1" style={{ color: '#475569' }}>
                  <Phone size={11} className="text-slate-400" /> {order.customer_phone}
                </p>
              )}
              {order.order_type === 'DELIVERY' ? (
                <div className="text-slate-600 pt-1" style={{ color: '#475569' }}>
                  <p className="font-medium text-slate-800" style={{ color: '#1e293b' }}>{order.delivery_address || 'Home Delivery Address'}</p>
                  {order.delivery_pincode && (
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5" style={{ color: '#64748b' }}>PIN: {order.delivery_pincode}</p>
                  )}
                </div>
              ) : (
                <p className="text-slate-600 pt-1 font-medium" style={{ color: '#475569' }}>Store Counter Pickup</p>
              )}
            </div>

            {/* Order & Delivery Slot Details */}
            <div 
              className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs print:border-slate-300"
              style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-1.5" style={{ color: '#94a3b8', borderColor: '#f1f5f9' }}>
                Fulfillment Details
              </p>
              <div className="flex justify-between items-center">
                <span className="text-slate-500" style={{ color: '#64748b' }}>Fulfillment Mode:</span>
                <span className="font-bold text-slate-900" style={{ color: '#0f172a' }}>
                  {order.order_type === 'DELIVERY' ? 'Home Delivery' : 'Store Pickup'}
                </span>
              </div>
              {order.delivery_slot_label ? (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500" style={{ color: '#64748b' }}>Scheduled Slot:</span>
                  <span className="font-bold text-indigo-700" style={{ color: '#4338ca' }}>
                    {order.delivery_slot_date} ({order.delivery_slot_label})
                  </span>
                </div>
              ) : order.pickup_time ? (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500" style={{ color: '#64748b' }}>Pickup Slot:</span>
                  <span className="font-bold text-slate-900" style={{ color: '#0f172a' }}>{order.pickup_time}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center">
                <span className="text-slate-500" style={{ color: '#64748b' }}>Order Status:</span>
                <span className={`font-bold ${order.status === 'COMPLETED' ? 'text-emerald-700' : (order.status === 'REJECTED' ? 'text-rose-600' : 'text-slate-800')}`} style={{ color: order.status === 'COMPLETED' ? '#047857' : (order.status === 'REJECTED' ? '#e11d48' : '#1e293b') }}>
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500" style={{ color: '#64748b' }}>Payment Status:</span>
                <span className="font-bold text-emerald-700" style={{ color: order.status === 'COMPLETED' ? '#047857' : (order.status === 'REJECTED' ? '#e11d48' : '#047857') }}>
                  {order.status === 'COMPLETED' ? 'PAID' : (order.status === 'REJECTED' ? 'CANCELLED' : 'DUE AT DELIVERY')}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-5 border border-slate-200 rounded-xl overflow-hidden shadow-2xs print:border-slate-300" style={{ borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] print:bg-slate-100 print:border-slate-400" style={{ backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }}>
                  <th className="py-2.5 px-3 text-center w-[6%]" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>#</th>
                  <th className="py-2.5 px-3 w-[54%]" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>Item Description</th>
                  <th className="py-2.5 px-3 text-center w-[12%]" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>Qty</th>
                  <th className="py-2.5 px-3 text-right w-[14%]" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right w-[14%]" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {order.items.map((item, index) => {
                  const isRejected = item.status === 'REJECTED';
                  return (
                    <tr key={index} className={`avoid-break hover:bg-slate-50/50 ${isRejected ? 'bg-rose-50/30' : ''}`}>
                      <td className={`py-2 px-3 text-center font-bold ${isRejected ? 'text-slate-400' : 'text-slate-500'}`}>
                        {index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold ${isRejected ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {item.product_name_snapshot}
                          </span>
                          {isRejected && (
                            <span className="text-[9px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded uppercase">
                              Unavailable
                            </span>
                          )}
                        </div>
                        {item.unit_snapshot && (
                          <span className="text-[11px] text-slate-500">{item.unit_snapshot}</span>
                        )}
                      </td>
                      <td className={`py-2 px-3 text-center font-semibold ${isRejected ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item.quantity}
                      </td>
                      <td className={`py-2 px-3 text-right ${isRejected ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                        {parseFloat(item.price_snapshot).toFixed(2)}
                      </td>
                      <td className={`py-2 px-3 text-right font-bold ${isRejected ? 'text-slate-400' : 'text-slate-900'}`}>
                        {isRejected ? '0.00' : parseFloat(item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-6 avoid-break">
            <div 
              className="w-full sm:w-80 border border-slate-200 rounded-xl overflow-hidden text-xs bg-white shadow-2xs print:border-slate-300"
              style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
            >
              <div className="p-3 space-y-1.5 text-slate-600" style={{ color: '#475569' }}>
                <div className="flex justify-between">
                  <span>Subtotal ({order.items.filter(i => i.status !== 'REJECTED').length} items)</span>
                  <span className="font-semibold text-slate-900" style={{ color: '#0f172a' }}>
                    ₹{order.items.filter(i => i.status !== 'REJECTED').reduce((acc, item) => acc + parseFloat(item.subtotal), 0).toFixed(2)}
                  </span>
                </div>

                {parseFloat(order.discount_applied) > 0 && (
                  <div className="flex justify-between text-indigo-600" style={{ color: '#4338ca' }}>
                    <span>Product Savings</span>
                    <span className="font-bold">-₹{parseFloat(order.discount_applied).toFixed(2)}</span>
                  </div>
                )}

                {parseFloat(order.promo_discount) > 0 && (
                  <div className="flex justify-between text-emerald-600" style={{ color: '#047857' }}>
                    <span>Promo Code Discount</span>
                    <span className="font-bold">-₹{parseFloat(order.promo_discount).toFixed(2)}</span>
                  </div>
                )}

                {parseFloat(order.packaging_fee) > 0 && (
                  <div className="flex justify-between">
                    <span>Packaging Charges</span>
                    <span className="font-semibold text-slate-900" style={{ color: '#0f172a' }}>₹{parseFloat(order.packaging_fee).toFixed(2)}</span>
                  </div>
                )}

                {order.order_type === 'DELIVERY' && (
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="font-semibold text-slate-900" style={{ color: '#0f172a' }}>
                      {parseFloat(order.delivery_fee) > 0 ? `₹${parseFloat(order.delivery_fee).toFixed(2)}` : 'FREE'}
                    </span>
                  </div>
                )}

                {parseFloat(order.wallet_discount) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-100 pt-1" style={{ color: '#047857', borderColor: '#f1f5f9' }}>
                    <span>Wallet Applied</span>
                    <span>-₹{parseFloat(order.wallet_discount).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-100 pt-1" style={{ borderColor: '#f1f5f9' }}>
                  <span className="font-medium text-slate-500" style={{ color: '#64748b' }}>Payment Mode</span>
                  <span className="font-bold text-slate-900 text-right max-w-[180px] break-words" style={{ color: '#0f172a' }}>
                    {getPaymentMethodDisplay()}
                  </span>
                </div>
              </div>

              {/* Total Due/Paid Banner */}
              <div 
                className="bg-emerald-50 border-t-2 border-emerald-600 px-3 py-2 flex justify-between items-center text-slate-900"
                style={{ backgroundColor: '#ecfdf5', borderColor: '#059669', color: '#064e3b' }}
              >
                <span className="font-bold uppercase tracking-wider text-xs" style={{ color: '#064e3b' }}>
                  {order.status === 'COMPLETED' ? 'Total Amount Paid' : 'Total Amount Due'}
                </span>
                <span className="text-xl font-black text-emerald-800" style={{ color: '#065f46' }}>
                  ₹{parseFloat(order.total_amount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer: Terms & Authorized Signature */}
          <div className="border-t border-slate-200 pt-4 mt-auto avoid-break flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-end text-xs">
            {/* Left: Terms & Conditions */}
            <div className="max-w-md space-y-1 text-slate-600">
              <h4 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] flex items-center gap-1 mb-1">
                <BadgeCheck size={12} className="text-emerald-600" /> Terms & Conditions
              </h4>
              <div className="text-[11px] leading-relaxed space-y-0.5">
                {(() => {
                  const rawTerms = settings?.invoice_terms_and_conditions || settings?.terms_and_conditions;
                  if (rawTerms && rawTerms.trim()) {
                    return rawTerms
                      .split('\n')
                      .map(line => line.trim())
                      .filter(Boolean)
                      .map((line, idx) => (
                        <p key={idx} className="break-words">{line}</p>
                      ));
                  }
                  return (
                    <>
                      <p>1. Goods once sold will not be taken back without original bill.</p>
                      <p>2. Report any damaged or missing items within 24 hours of delivery.</p>
                      <p>3. This is a computer-generated tax invoice and requires no physical signature.</p>
                    </>
                  );
                })()}
              </div>
              <p className="text-[11px] font-semibold text-emerald-800 pt-1">
                Thank you for shopping with {settings?.store_name || "Narendra Kirana"}!
              </p>
            </div>

            {/* Right: Signature Box */}
            <div className="w-full sm:w-auto text-left sm:text-right shrink-0">
              <p className="text-[11px] font-bold text-slate-600 mb-1">
                For {settings?.store_name || "Narendra Kirana"}
              </p>
              <div className="h-14 flex flex-col justify-end items-start sm:items-end">
                {settings?.invoice_signature ? (
                  <img 
                    src={settings.invoice_signature} 
                    alt="Authorized Signature" 
                    className="max-h-12 object-contain"
                  />
                ) : (
                  <div className="w-40 border-b border-dashed border-slate-400 mb-1"></div>
                )}
              </div>
              <p className="text-xs font-black text-slate-900">Authorized Signatory</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Computer Generated Invoice</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Invoice;
