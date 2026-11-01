import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Download, Briefcase, Truck } from 'lucide-react';
import api from './services/api';


export default function DownloadPage() {
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const mainViewRef = useRef(null);
  const [refCode, setRefCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get('ref') || params.get('code') || params.get('referral_code') || '').trim().toUpperCase();
    if (ref) {
      setRefCode(ref);
      api.post('/auth/record-download-referral/', { referral_code: ref }).catch(() => {});
    }
  }, []);

  const handleDownloadClick = () => {
    if (refCode) {
      navigator.clipboard.writeText(refCode).then(() => setCopied(true)).catch(() => {});
    }
  };

  useLayoutEffect(() => {
    if (mainViewRef.current) {
      mainViewRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      setTimeout(() => {
        mainViewRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 50);
    }
  }, [loading]);

  useEffect(() => {
    api.get('/store/settings/', { params: { t: Date.now() } })
      .then((res) => setStoreSettings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const appName = storeSettings?.app_name || storeSettings?.store_name || 'Narendra Kirana';
  const appIconUrl = storeSettings?.app_icon || null;
  const buttonText = storeSettings?.app_download_btn_text || 'Download APK';

  const rawUpdateUrl = (storeSettings?.app_update_url || '').trim();
  const isPlayStoreUrl = rawUpdateUrl.includes('play.google.com') || rawUpdateUrl.startsWith('market://');

  const customerApkUrl = (rawUpdateUrl && !isPlayStoreUrl)
    ? rawUpdateUrl
    : '/download-apk/customer';

  const ownerApkUrl = storeSettings?.owner_app_update_url?.trim() || '/download-apk/owner';
  const deliveryApkUrl = storeSettings?.delivery_app_update_url?.trim() || '/download-apk/delivery';

  return (
    <div className="bg-[#09090b] text-zinc-100 antialiased font-sans relative select-none">
      
      {/* Fixed App Bar */}
      <header className="fixed top-0 left-0 w-full flex items-center justify-center gap-3 py-4 z-50 bg-[#09090b]/80 backdrop-blur-lg border-b border-white/5">
        <img src="/logo-transparent.png" alt="Logo" className="size-8 object-contain" />
        <span className="font-bold text-lg text-zinc-100">{appName}</span>
      </header>
      
      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col">
        
        {/* ================================================== */}
        {/* 1. HIDDEN EASTER EGG SECTION (ABOVE MAIN VIEW)    */}
        {/* ================================================== */}
        <div className="w-full flex flex-col space-y-3 pt-24 pb-32 px-6 opacity-80">
          <a
            href={ownerApkUrl}
            download="narendra-kirana-owner.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Briefcase size={20} className="text-zinc-400" />
              <span className="font-semibold text-zinc-200 text-sm">Store Owner</span>
            </div>
            <Download size={18} className="text-zinc-500" />
          </a>

          <a
            href={deliveryApkUrl}
            download="narendra-kirana-delivery.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-zinc-400" />
              <span className="font-semibold text-zinc-200 text-sm">Delivery Partner</span>
            </div>
            <Download size={18} className="text-zinc-500" />
          </a>
        </div>

        {/* ================================================== */}
        {/* 2. MAIN CUSTOMER VIEW (AUTO-SCROLLED TO TOP)      */}
        {/* ================================================== */}
        <div ref={mainViewRef} className="w-full min-h-screen flex flex-col items-center px-6 pt-12 pb-20 animate-in fade-in duration-500 scroll-mt-16">
          


          <div className="w-full flex flex-col items-center text-center space-y-8 mt-4">
            
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000 animate-pulse"></div>
              {loading ? (
                <div className="relative size-32 rounded-[2rem] bg-zinc-900 animate-pulse" />
              ) : (
                <img
                  src={appIconUrl || "/logo.jpg"}
                  alt={appName}
                  className="relative size-32 rounded-[2rem] object-cover shadow-2xl ring-1 ring-white/10"
                />
              )}
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="h-8 w-40 bg-zinc-900 rounded-lg animate-pulse mx-auto" />
              ) : (
                <>
                  <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 tracking-tight">
                    {appName}
                  </h1>
                  <p className="text-sm font-medium text-zinc-500 max-w-[260px] mx-auto leading-relaxed">
                    Get fresh groceries and daily essentials delivered right to your door.
                  </p>
                </>
              )}
            </div>

            <div className="w-full space-y-4 pt-6">
              {loading ? (
                <div className="h-14 w-full bg-zinc-900 rounded-2xl animate-pulse" />
              ) : (
                <>
                  {refCode && (
                    <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-4 flex flex-col items-center text-center animate-in zoom-in duration-300">
                      <span className="text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">Referral invite</span>
                      <span className="text-white font-mono font-bold tracking-widest text-lg bg-zinc-900/50 px-4 py-1.5 rounded-lg border border-white/5">{refCode}</span>
                      <span className="text-zinc-400 text-xs mt-2 font-medium">
                        {copied ? 'Code copied to clipboard. Auto-applies in app.' : 'Code will copy automatically on download.'}
                      </span>
                    </div>
                  )}

                  <a
                    onClick={handleDownloadClick}
                    href={customerApkUrl}
                    download="narendra-kirana.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative w-full py-4 px-6 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] transition-all active:scale-95"
                  >
                    <Download size={22} strokeWidth={2.5} className="group-hover:-translate-y-0.5 transition-transform" />
                    <span>{buttonText}</span>
                  </a>

                  

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled
                      className="w-full py-4 px-6 rounded-2xl bg-zinc-900/50 text-zinc-500 font-semibold text-sm flex items-center justify-center gap-2.5 cursor-not-allowed border border-zinc-800/50"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Play Store (Coming Soon)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          {/* Fixed Footer */}
          <div className="fixed bottom-6 left-0 w-full flex flex-col items-center justify-center pointer-events-auto opacity-70 hover:opacity-100 transition-opacity z-50">
            <span className="text-xs font-medium text-zinc-500">Built by</span>
            <a 
              href="https://ssn-portfolio.netlify.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-bold text-zinc-300 hover:text-white hover:underline transition-colors mt-0.5"
            >
              Sai Satyanarayana
            </a>
            <span className="text-[10px] font-semibold text-zinc-600 tracking-widest uppercase mt-1">Full Stack Developer</span>
          </div>
          </div>
        </div>

      </div>
    </div>
  );
}
