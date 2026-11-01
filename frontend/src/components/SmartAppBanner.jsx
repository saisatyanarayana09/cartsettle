import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Smartphone, X, ExternalLink } from 'lucide-react';

/**
 * Launches the native mobile app if installed, or gracefully falls back to the download page.
 * Uses Android Intent URI on Android Chrome to avoid popup blockers and ERR_UNKNOWN_URL_SCHEME errors.
 */
export function openAppOrFallback(pathAndQuery = '') {
  if (typeof window === 'undefined') return;

  const raw = (pathAndQuery || '').replace(/^\/+/, '');
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isAndroid = /Android/i.test(ua);
  const fallbackUrl = encodeURIComponent(`${window.location.origin}/download`);

  if (isAndroid) {
    // Android Chrome Intent URI
    // If com.narendrakirana.app is installed, Android launches it immediately.
    // If not installed, Chrome falls back cleanly to the web download page.
    const intentUrl = `intent://${raw}#Intent;scheme=smartkirana;package=com.narendrakirana.app;S.browser_fallback_url=${fallbackUrl};end`;
    window.location.href = intentUrl;
  } else {
    // iOS and other platforms
    const appSchemeUrl = raw ? `smartkirana://${raw}` : 'smartkirana://';
    const start = Date.now();
    window.location.href = appSchemeUrl;
    setTimeout(() => {
      if (Date.now() - start < 2000 && !document.hidden) {
        window.location.href = '/download';
      }
    }, 1500);
  }
}

export function SmartAppBanner() {
  const [isMobileDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  });

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(sessionStorage.getItem('smart_kirana_app_banner_dismissed'));
    } catch {
      return false;
    }
  });

  const location = useLocation();

  if (!isMobileDevice || dismissed) {
    return null;
  }

  // Current route with query parameters
  const currentPath = location.pathname.replace(/^\/+|\/+$/g, '');
  const search = location.search || '';
  const currentRoute = currentPath ? `${currentPath}${search}` : (search ? `${search}` : '');

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('smart_kirana_app_banner_dismissed', 'true');
    } catch {}
  };

  const handleOpenApp = () => {
    openAppOrFallback(currentRoute);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm sticky top-0 z-50">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Smartphone size={18} className="text-white" />
        </div>
        <div className="truncate">
          <p className="font-extrabold truncate">Narendra Kirana Mobile App</p>
          <p className="text-emerald-100 text-[11px] truncate">
            Faster checkout, live order tracking & instant invoices
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <button
          type="button"
          onClick={handleOpenApp}
          className="px-3.5 py-2 min-h-[40px] bg-white text-emerald-800 font-extrabold rounded-lg shadow-sm hover:bg-emerald-50 active:scale-95 transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
        >
          Open App <ExternalLink size={12} />
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default SmartAppBanner;
