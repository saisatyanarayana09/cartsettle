import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ExternalLink, Loader2, FileText, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const InvoiceModal = ({ orderId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const iframeRef = useRef(null);

  const handlePrint = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (err) {
        console.error('Failed to trigger print on iframe:', err);
      }
    }
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handlePrint]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 15, 140));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 15, 70));
  };

  const handleZoomReset = () => {
    setZoom(100);
  };

  const invoiceUrl = `/owner/orders/${orderId}/invoice?modal=1`;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice for Order ${orderId}`}
    >
      <div 
        className="bg-white dark:bg-[#0d1322] rounded-none sm:rounded-2xl w-full h-full sm:h-[94vh] sm:max-w-5xl sm:max-h-[960px] shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Tax Invoice
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  #{orderId}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Print preview & official invoice document
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            <div className="hidden md:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-2xs text-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 70}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-40 transition-colors"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="px-2 py-0.5 font-bold font-mono text-[11px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                title="Reset Zoom"
              >
                {zoom}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 140}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-40 transition-colors"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              title="Print Tax Invoice (Ctrl+P)"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print / Download</span>
              <span className="sm:hidden">Print</span>
            </button>

            {/* Open in New Tab Button */}
            <a
              href={`/owner/orders/${orderId}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Open standalone page in new tab"
              aria-label="Open invoice in new tab"
            >
              <ExternalLink size={15} />
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close invoice popup"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Modal Content / Invoice Preview */}
        <div className="relative flex-1 bg-slate-100 dark:bg-slate-950 overflow-auto">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-xs transition-opacity">
              <Loader2 className="w-7 h-7 text-emerald-600 animate-spin mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Generating tax invoice preview...
              </p>
            </div>
          )}

          <div 
            className="w-full h-full transition-transform duration-150 origin-top"
            style={{ 
              transform: zoom === 100 ? 'none' : `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              width: zoom > 100 ? `${zoom}%` : '100%'
            }}
          >
            <iframe
              ref={iframeRef}
              src={invoiceUrl}
              title={`Tax Invoice for Order ${orderId}`}
              onLoad={() => setLoading(false)}
              className="w-full h-full border-0 bg-transparent min-h-[500px]"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvoiceModal;
