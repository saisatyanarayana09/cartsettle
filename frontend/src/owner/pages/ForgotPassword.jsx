import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Store, Mail, ArrowLeft, Loader2, CheckCircle2, ShieldAlert, KeyRound, Link2, ExternalLink } from 'lucide-react';

import { getEmailProviderUrl, getEmailProviderName } from '../../utils/emailProvider';

export default function OwnerForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('link'); // 'link' (default) | 'otp'
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await api.post('/auth/password-reset/', { 
        email: email.trim(),
        method,
        portal: 'owner'
      });
      const msg = typeof res.data === 'string' 
        ? res.data 
        : (res.data?.message || 'Password reset instructions have been sent.');
      setStatus('success');
      setMessage(String(msg));

      if (method === 'otp') {
        setTimeout(() => {
          navigate(`/owner/reset-password?email=${encodeURIComponent(email.trim())}&mode=otp`);
        }, 1500);
      }
    } catch (err) {
      setStatus('error');
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string' 
        ? errData 
        : (errData?.error || errData?.detail || errData?.message || '');
      setMessage(String(errMsg || (err.response ? `Server error (${err.response.status})` : 'Network error. Please try again.')));
    }
  };

  return (
    <main className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Left Column: Reset Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Back to Login link */}
          <Link 
            to="/owner/login" 
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Back to Owner Sign In
          </Link>

          <div className="mb-8">
            <p className="text-sm font-black tracking-[0.2em] uppercase drop-shadow-sm mb-3 flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-md">
                <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </span>
              <span className="text-emerald-900 dark:text-emerald-400">NARENDRA</span>{' '}
              <span className="text-indigo-600 dark:text-indigo-400">KIRANA</span>
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Reset Password
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Choose your recovery method and enter your registered owner or manager email address.
            </p>
          </div>

          {status === 'success' ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200 mb-2">
                {method === 'link' ? 'Reset Link Sent' : '6-Digit OTP Sent'}
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed mb-4">
                {message}
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold mb-6">
                {method === 'link'
                  ? '⏱ Link expires in 15 minutes. Check your inbox or spam folder.'
                  : '⏱ Code expires in 15 minutes. Enter code to set a new password.'}
              </p>
              <div className="space-y-2.5">
                {method === 'link' ? (
                  <>
                    <a
                      href={getEmailProviderUrl(email)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-md shadow-indigo-600/20 active:scale-[0.98]"
                    >
                      <ExternalLink size={16} />
                      <span>Open {getEmailProviderName(email)}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setMethod('otp');
                        setStatus('idle');
                        setMessage('');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 font-bold transition-all text-xs cursor-pointer"
                    >
                      <KeyRound size={14} />
                      <span>Didn't get an email? Try 6-Digit OTP instead</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to={`/owner/reset-password?email=${encodeURIComponent(email)}&mode=otp`}
                    className="block w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-md shadow-indigo-600/20"
                  >
                    Enter 6-Digit OTP Code Now →
                  </Link>
                )}

                <Link
                  to="/owner/login"
                  className="block w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-xs transition shadow-sm"
                >
                  Return to Owner Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => { setStatus('idle'); setMessage(''); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer pt-1"
                >
                  Did not receive an email? Try again
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {status === 'error' && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm font-bold text-red-700 dark:text-red-300 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
              )}

              {/* Method Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  Select Recovery Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Reset Link (Default) */}
                  <button
                    type="button"
                    onClick={() => setMethod('link')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 relative cursor-pointer ${
                      method === 'link'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${method === 'link' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          <Link2 size={16} />
                        </div>
                        <span className={`text-xs font-extrabold ${method === 'link' ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          Reset Link
                        </span>
                      </div>
                      <span className="text-[9px] font-extrabold tracking-tight uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        Default
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1">
                      1-click recovery button sent to inbox
                    </span>
                  </button>

                  {/* Option 2: 6-Digit OTP */}
                  <button
                    type="button"
                    onClick={() => setMethod('otp')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                      method === 'otp'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${method === 'otp' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <KeyRound size={16} />
                      </div>
                      <span className={`text-xs font-extrabold ${method === 'otp' ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        6-Digit OTP
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1">
                      Fast reset directly on this screen
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="owner-email" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Owner Email Address
                </label>
                <div className="relative">
                  <input
                    id="owner-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@narendra-kirana.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3.5 pl-11 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm text-sm"
                  />
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-bold text-white hover:bg-indigo-700 transition-all shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:shadow-none disabled:transform-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending Instructions...
                  </>
                ) : (
                  method === 'link' ? 'Send Recovery Link' : 'Send 6-Digit OTP Code'
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/owner/login"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right Column: Hero Showcase */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 to-slate-900/80 z-10 mix-blend-multiply" />
        <img
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920"
          alt="Grocery store interior"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent z-10" />

        <div className="absolute bottom-0 left-0 p-16 z-20 w-full max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-indigo-200 mb-4">
            <span>🛡️ Owner Account Security</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            Protecting your store <br />and business data.
          </h2>
          <p className="text-indigo-100/80 text-lg leading-relaxed font-medium max-w-lg">
            Encrypted recovery links ensure only authorized store owners and operators can access management tools and analytics.
          </p>
        </div>
      </div>
    </main>
  );
}
