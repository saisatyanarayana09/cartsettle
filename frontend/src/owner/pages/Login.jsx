import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from '../../router';
import api from '../../services/api';
import { Eye, EyeOff, Loader2, Store, Mail, User, Lock, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

const OwnerLoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState(localStorage.getItem('smart-kirana-owner-username') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const isEmail = identifier.includes('@');

  // Gentle background ping to warm backend on load
  useEffect(() => {
    api.get('/store/settings/').catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Backend EmailOrUsernameModelBackend and CustomTokenObtainPairSerializer accept email or username in either field
      const { data } = await api.post('/auth/login/', {
        username: identifier.trim(),
        email: isEmail ? identifier.trim() : undefined,
        password: password
      });

      // Grant access if account is marked as owner or staff
      if (!data.user.is_owner && !data.user.is_staff) {
        throw new Error('This account does not have store owner/management access.');
      }

      localStorage.setItem('smart-kirana-owner-token', data.access);
      const isOwnerDomain = typeof window !== 'undefined' && (
        window.location.hostname.includes('owner') ||
        window.location.hostname.includes('admin')
      );
      const defaultRedirect = isOwnerDomain ? '/welcome' : '/owner/welcome';
      const from = location.state?.from?.pathname || defaultRedirect;
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setSubmitting(true);
      try {
        const { data } = await api.post('/auth/google-login/', { 
          credential: tokenResponse.access_token,
          token_type: 'access_token'
        });

        if (!data.user.is_owner && !data.user.is_staff) {
          throw new Error('This Google account does not have owner access.');
        }

        localStorage.setItem('smart-kirana-owner-token', data.access);
        localStorage.setItem('smart-kirana-owner-refresh', data.refresh);
        localStorage.setItem('smart-kirana-owner-user', JSON.stringify(data.user));

        const isOwnerDomain = typeof window !== 'undefined' && (
          window.location.hostname.includes('owner') ||
          window.location.hostname.includes('admin')
        );
        const defaultRedirect = isOwnerDomain ? '/welcome' : '/owner/welcome';
        const from = location.state?.from?.pathname || defaultRedirect;
        navigate(from, { replace: true });
      } catch (requestError) {
        setError(requestError.response?.data?.detail || 'Unable to sign in with Google.');
      } finally {
        setSubmitting(false);
      }
    },
    onError: () => setError('Google Sign-In failed or was cancelled.')
  });

  const handleOneClickOwnerDemo = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login/', {
        username: 'owner',
        password: 'CartSettle@2026',
      });
      if (!data.user.is_owner && !data.user.is_staff) {
        throw new Error('This account does not have store owner/management access.');
      }
      localStorage.setItem('smart-kirana-owner-token', data.access);
      localStorage.setItem('smart-kirana-owner-refresh', data.refresh);
      localStorage.setItem('smart-kirana-owner-user', JSON.stringify(data.user));
      const defaultRedirect = '/owner';
      const from = location.state?.from?.pathname || defaultRedirect;
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Owner demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex bg-white dark:bg-slate-950 font-sans antialiased">
      {/* Left Column: Form & Brand Console */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md">

          {/* Back to Storefront Link */}
          <div className="mb-6">
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Back to Storefront</span>
            </Link>
          </div>

          {/* Brand Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3.5 mb-3">

              <div>
                <p className="text-[11px] font-black tracking-normal text-emerald-900 dark:text-emerald-400">
                  Cart<span className="text-indigo-600 dark:text-indigo-400">Settle</span>
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Owner Portal
                </h1>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Sign in with your registered <b>Owner Email</b> or username to manage orders, inventory, and sales.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-sm font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={submit} className="space-y-5">
            {/* Demo Login Button */}
            <div>
              <button
                type="button"
                disabled={submitting}
                onClick={handleOneClickOwnerDemo}
                className="w-full h-11 flex items-center justify-center gap-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <span>{submitting ? 'Logging in...' : 'Demo Login'}</span>
                <ArrowRight size={16} className="text-indigo-200" />
              </button>
            </div>

            {/* Google Login Button */}
            <div>
              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                className="w-full h-11 flex items-center justify-center gap-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-xs transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Sign in with Google</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-4">
              <span className="absolute bg-white dark:bg-slate-950 px-3 text-xs font-medium text-slate-400">
                or
              </span>
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>

            <div className="space-y-4">
              {/* Dynamic Email or Username Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="owner-identifier" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Email or Username
                  </label>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isEmail ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                    {isEmail ? '✓ Email' : 'Email or Username'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {isEmail ? <Mail size={18} className="text-indigo-600 dark:text-indigo-400" /> : <User size={18} />}
                  </div>
                  <input
                    id="owner-identifier"
                    autoFocus
                    required
                    type="text"
                    placeholder="owner@cartsettle.store or username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="owner-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Password
                  </label>
                  <Link 
                    to="/owner/forgot-password" 
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    id="owner-password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none rounded-lg transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {capsLockActive && (
                  <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    Caps Lock is ON
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-3.5 font-bold text-white transition-all shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:shadow-none disabled:transform-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign in to Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Customer Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Looking for daily groceries and shopping?{' '}
              <Link to="/" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                Go to Customer Storefront →
              </Link>
            </p>
          </div>

        </div>
      </div>

      {/* Right Column: Hero Showcase (Desktop) */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-emerald-950/80 z-10 mix-blend-multiply" />
        <img
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920"
          alt="Grocery store operations"
          className="absolute inset-0 w-full h-full object-cover scale-105 opacity-65"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent z-10" />

        <div className="absolute bottom-0 left-0 p-16 z-20 w-full max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 backdrop-blur-md border border-emerald-400/20 text-xs font-bold text-emerald-300 mb-4">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Retail Management & Cloud Sync</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            Manage your store <br />
            <span className="text-emerald-400">effortlessly in real-time.</span>
          </h2>
          <p className="text-indigo-100/80 text-base leading-relaxed font-medium mb-6">
            Track orders instantly, monitor inventory, manage dynamic homepage banners, and analyze sales performance across all channels.
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Unified Email Authentication</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Automatic Role Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Dedicated Password Recovery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Real-Time Inventory & POS</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const DEFAULT_GOOGLE_CLIENT_ID = '729937153109-6e8fivp20b3ri2qsah1d6u2a7oi0uls6.apps.googleusercontent.com';

const OwnerLogin = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <OwnerLoginForm />
    </GoogleOAuthProvider>
  );
};

export default OwnerLogin;
