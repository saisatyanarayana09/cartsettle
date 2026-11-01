import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Automatically reload at most ONCE if dynamic imports fail due to fresh deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const reloadCount = Number(sessionStorage.getItem('vite_preload_reload_count') || 0);
    if (reloadCount < 1) {
      sessionStorage.setItem('vite_preload_reload_count', '1');
      window.location.reload();
    } else {
      console.warn('vite:preloadError: Max reload attempt reached. Halting auto-reload to prevent loop.');
    }
  });

  // Proactive Service Worker cleanup for auth & password reset pages
  const pathname = window.location.pathname;
  if (pathname.includes('/reset-password') || pathname.includes('/owner/reset-password')) {
    sessionStorage.removeItem('vite_preload_reload_count');
    sessionStorage.removeItem('lazy_chunk_retry_count');
    sessionStorage.removeItem('eb_chunk_reload_count');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.update().catch(() => {});
        }
      }).catch(() => {});
    }
  }
}

createRoot(document.getElementById('root')).render(
 <StrictMode>
 <App />
 </StrictMode>,
)
