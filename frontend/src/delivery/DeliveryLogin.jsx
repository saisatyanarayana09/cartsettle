import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Package, CheckCircle2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../services/api';

function GoogleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const BRAND_POINTS = [
  { icon: Package,      text: 'Receive store-assigned orders in real time' },
  { icon: ShieldCheck,  text: 'OTP-secured delivery handover for every order' },
  { icon: CheckCircle2, text: 'Full trip history and fulfillment log' },
];

export default function DeliveryLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const res = await api.post('/auth/google/delivery/', {
          credential: tokenResponse.access_token,
          token_type: 'access_token'
        });
        const user = res.data.user;
        localStorage.setItem('smart-kirana-delivery-token', res.data.access);
        localStorage.setItem('smart-kirana-delivery-refresh', res.data.refresh);
        localStorage.setItem('smart-kirana-delivery-user', JSON.stringify(user));
        localStorage.setItem('smart-kirana-token', res.data.access);
        localStorage.setItem('smart-kirana-refresh', res.data.refresh);
        navigate('/');
      } catch (err) {
        const msg = err.response?.data?.detail || err.response?.data?.message || 'Unable to sign in with Google.';
        setError(msg);
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Google Sign-In was cancelled or failed.');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/', {
        username: username.trim(),
        password: password
      });
      const user = res.data.user;
      const isPartner = Boolean(
        user?.is_delivery_partner ||
        user?.is_owner ||
        user?.is_staff ||
        user?.is_superuser
      );
      if (!isPartner) {
        setError('Access denied. This account is not registered as a Delivery Partner. Contact the store owner.');
        setLoading(false);
        return;
      }
      localStorage.setItem('smart-kirana-delivery-token', res.data.access);
      localStorage.setItem('smart-kirana-delivery-refresh', res.data.refresh);
      localStorage.setItem('smart-kirana-delivery-user', JSON.stringify(user));
      localStorage.setItem('smart-kirana-token', res.data.access);
      localStorage.setItem('smart-kirana-refresh', res.data.refresh);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Invalid username or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex antialiased overflow-hidden">

      {/* ── LEFT: Brand Panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col justify-between relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-r border-slate-800/60 p-10">
        {/* Glow */}
        <div className="absolute top-0 left-0 w-full h-64 bg-emerald-500/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-teal-600/8 blur-3xl pointer-events-none" />

        {/* Top */}
        <div className="relative z-10">
          {/* Brand Mark */}
          <div className="flex items-center gap-3 mb-12">
            <div className="size-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-base font-black text-white leading-tight">Narendra Kirana</p>
              <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Delivery Partner Portal</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight tracking-tight mb-4">
            Your orders.<br />
            <span className="text-emerald-400">Your dashboard.</span>
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-10">
            Sign in to access your delivery assignments, trip history, and real-time order updates from the store.
          </p>

          {/* Feature List */}
          <div className="space-y-5">
            {BRAND_POINTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Icon size={17} />
                </div>
                <p className="text-sm text-slate-300 font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="relative z-10 text-xs text-slate-600 font-medium">
          © {new Date().getFullYear()} Narendra Kirana
        </p>
      </div>

      {/* ── RIGHT: Login Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Mobile ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-600/8 blur-[100px] pointer-events-none lg:hidden" />

        <div className="w-full max-w-sm relative z-10">

          {/* Mobile-only brand mark */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="size-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Truck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight">Narendra Kirana</p>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Delivery Partner Portal</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-white tracking-tight">Sign In</h1>
            <p className="text-sm text-slate-400 mt-1">Enter your partner credentials to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Login for Delivery Partner */}
            <div>
              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all text-sm font-bold text-white cursor-pointer active:scale-[0.99] disabled:opacity-50 shadow-xs"
              >
                <GoogleIcon />
                <span>{googleLoading ? 'Verifying partner account...' : 'Sign in with Google'}</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <span className="bg-slate-950 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                or sign in with credentials
              </span>
              <div className="w-full border-t border-slate-800" />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Username
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                  <User size={17} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your partner username"
                  required
                  autoComplete="username"
                  className="w-full bg-slate-900 border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                  <Lock size={17} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-900 border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-500 hover:text-slate-300 p-1 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="mt-8 text-center text-xs text-slate-600">
            Credentials are assigned by the store owner.
          </p>
        </div>
      </div>
    </div>
  );
}



