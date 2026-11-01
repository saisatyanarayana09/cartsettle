import React, { useState, useEffect } from 'react';
import { 
  User, Phone, Bike, CheckCircle2, 
  LogOut, Award, Truck, ShieldCheck, Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { clearAllBrowserCaches } from '../services/api';

export default function DeliveryProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/delivery/dashboard/')
      .then(res => setProfile(res.data?.profile))
      .catch(err => console.error('Error loading profile:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    const refresh = localStorage.getItem('smart-kirana-delivery-refresh');
    if (refresh) {
      api.post('/auth/logout/', { refresh }).catch(() => {});
    }
    await clearAllBrowserCaches();
    localStorage.removeItem('smart-kirana-delivery-token');
    localStorage.removeItem('smart-kirana-delivery-refresh');
    localStorage.removeItem('smart-kirana-delivery-user');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="size-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Loading partner profile...</p>
      </div>
    );
  }

  const riderName = profile?.name || 'Rider';
  const initial = riderName.charAt(0).toUpperCase();

  return (
    <div className="max-w-xl mx-auto space-y-6 py-2">
      {/* Rider Identity Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="size-24 rounded-3xl bg-slate-950 border border-slate-800 p-1 mx-auto mb-4 shadow-xl flex items-center justify-center relative">
          <div className="size-full rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-3xl shadow-inner">
            {initial}
          </div>
          <span className="absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-slate-950 bg-emerald-500" />
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight">{riderName}</h1>
        {profile?.username && (
          <p className="text-xs sm:text-sm font-mono text-slate-400 mt-0.5">@{profile.username}</p>
        )}

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mt-4">
          <CheckCircle2 size={13} />
          <span>Verified Partner Fleet Member</span>
        </div>
      </div>

      {/* KPI & Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center shadow-lg">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Lifetime Completed</p>
          <p className="text-2xl sm:text-3xl font-black text-white">{profile?.total_deliveries || 0}</p>
          <p className="text-[11px] text-emerald-400 font-bold mt-0.5">Deliveries</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center shadow-lg">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fleet Status</p>
          <p className="text-base sm:text-lg font-black text-emerald-400 mt-2">Active</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Ready for Orders</p>
        </div>
      </div>

      {/* Profile Details List */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Partner Details</h2>

        <div className="space-y-3">
          {profile?.phone && (
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="size-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                <Phone size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact Number</p>
                <a href={`tel:${profile.phone}`} className="text-sm font-bold text-white hover:text-emerald-400 transition-colors">
                  {profile.phone}
                </a>
              </div>
            </div>
          )}

          {(profile?.vehicle_type || profile?.vehicle_number) && (
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="size-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                <Bike size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Registered Vehicle</p>
                <p className="text-sm font-bold text-white">
                  {[profile?.vehicle_type, profile?.vehicle_number].filter(Boolean).join(' • ') || '—'}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="size-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Organization</p>
              <p className="text-sm font-bold text-white">Narendra Kirana Store Logistics</p>
            </div>
          </div>
        </div>
      </div>

      {/* End Shift / Sign Out */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-black text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-lg shadow-rose-950/20"
      >
        <LogOut size={16} />
        <span>End Shift & Sign Out</span>
      </button>
    </div>
  );
}

