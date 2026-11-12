import React, { useState } from 'react';
import { Link, useNavigate } from '../../router';
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
    <main className="min-h-screen flex bg-white dark:bg-[#351D28]">
      {/* Left Column: Reset Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Back to Login link */}
          <Link 
            to="/owner/login" 
            className="inline-flex items-center gap-0 text-sm font-bold text-[#7D6671] hover:text-[#56323E] transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Back to Owner Sign In
          </Link>

          <div className="mb-8">
            <p className="text-sm font-black tracking-normal drop-shadow-sm mb-3 flex items-center gap-0">
              <span className="text-emerald-900 dark:text-emerald-400">Cart</span>
              <span className="text-[#56323E] dark:text-[#EFDFD2]">Settle</span>
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2D1822] dark:text-white tracking-tight">
              Reset Password
            </h1>
            <p className="text-base text-[#7D6671] dark:text-[#C5B0BA] mt-2 font-medium">
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
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#56323E] hover:bg-[#432634] text-white font-bold text-sm transition shadow-md shadow-[#56323E]/20 active:scale-[0.98]"
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
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#E7DBCF] dark:border-white/10 text-[#56323E] dark:text-[#EFDFD2] bg-[#FAF5EF]/50 dark:bg-[#432634] hover:bg-[#EFDFD2] font-bold transition-all text-xs cursor-pointer"
                    >
                      <KeyRound size={14} />
                      <span>Didn't get an email? Try 6-Digit OTP instead</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to={`/owner/reset-password?email=${encodeURIComponent(email)}&mode=otp`}
                    className="block w-full py-3 px-4 rounded-xl bg-[#56323E] hover:bg-[#432634] text-white font-bold text-sm transition shadow-md shadow-[#56323E]/20"
                  >
                    Enter 6-Digit OTP Code Now →
                  </Link>
                )}

                <Link
                  to="/owner/login"
                  className="block w-full py-2.5 px-4 rounded-xl border border-[#E7DBCF] dark:border-white/[0.08] hover:bg-[#FAF5EF] dark:hover:bg-[#351D28] text-[#5E4752] dark:text-[#C5B0BA] font-bold text-xs transition shadow-sm"
                >
                  Return to Owner Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => { setStatus('idle'); setMessage(''); }}
                  className="text-xs font-bold text-[#7D6671] hover:text-[#5E4752] dark:hover:text-[#C5B0BA] transition cursor-pointer pt-1"
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
                <label className="block text-xs font-bold text-[#5E4752] dark:text-[#C5B0BA] uppercase tracking-wider mb-2.5">
                  Select Recovery Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Reset Link (Default) */}
                  <button
                    type="button"
                    onClick={() => setMethod('link')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 relative cursor-pointer ${
                      method === 'link'
                        ? 'border-[#56323E] bg-[#FAF5EF]/70 dark:bg-[#432634] ring-2 ring-[#56323E]/20 shadow-sm'
                        : 'border-[#E7DBCF] dark:border-white/[0.08] bg-[#FAF5EF]/60 dark:bg-[#351D28]/60 hover:bg-[#F2E9E0]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-0">
                        <div className={`p-1.5 rounded-lg ${method === 'link' ? 'bg-[#56323E] text-white' : 'bg-[#EFDFD2] dark:bg-[#3F2231] text-[#5E4752] dark:text-[#C5B0BA]'}`}>
                          <Link2 size={16} />
                        </div>
                        <span className={`text-xs font-extrabold ${method === 'link' ? 'text-[#2D1822] dark:text-[#EFDFD2]' : 'text-[#5E4752] dark:text-[#C5B0BA]'}`}>
                          Reset Link
                        </span>
                      </div>
                      <span className="text-[9px] font-extrabold tracking-tight uppercase px-1.5 py-0.5 rounded-md bg-[#EFDFD2] dark:bg-[#432634] text-[#56323E] dark:text-[#EFDFD2]">
                        Default
                      </span>
                    </div>
                    <span className="text-[11px] text-[#7D6671] dark:text-[#C5B0BA] leading-tight mt-1">
                      1-click recovery button sent to inbox
                    </span>
                  </button>

                  {/* Option 2: 6-Digit OTP */}
                  <button
                    type="button"
                    onClick={() => setMethod('otp')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                      method === 'otp'
                        ? 'border-[#56323E] bg-[#FAF5EF]/70 dark:bg-[#432634] ring-2 ring-[#56323E]/20 shadow-sm'
                        : 'border-[#E7DBCF] dark:border-white/[0.08] bg-[#FAF5EF]/60 dark:bg-[#351D28]/60 hover:bg-[#F2E9E0]/60'
                    }`}
                  >
                    <div className="flex items-center gap-0">
                      <div className={`p-1.5 rounded-lg ${method === 'otp' ? 'bg-[#56323E] text-white' : 'bg-[#EFDFD2] dark:bg-[#3F2231] text-[#5E4752] dark:text-[#C5B0BA]'}`}>
                        <KeyRound size={16} />
                      </div>
                      <span className={`text-xs font-extrabold ${method === 'otp' ? 'text-[#2D1822] dark:text-[#EFDFD2]' : 'text-[#5E4752] dark:text-[#C5B0BA]'}`}>
                        6-Digit OTP
                      </span>
                    </div>
                    <span className="text-[11px] text-[#7D6671] dark:text-[#C5B0BA] leading-tight mt-1">
                      Fast reset directly on this screen
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="owner-email" className="block text-sm font-bold text-[#5E4752] dark:text-[#FAF5EF] mb-1.5">
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
                    placeholder="owner@example.com"
                    className="w-full rounded-xl border border-[#E7DBCF] dark:border-white/[0.08] px-4 py-3.5 pl-11 bg-[#FAF5EF] dark:bg-[#351D28] text-[#2D1822] dark:text-white outline-none focus:bg-white dark:focus:bg-[#351D28] focus:ring-2 focus:ring-[#56323E]/20 focus:border-[#56323E] transition-all shadow-sm text-sm"
                  />
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A68B98]" />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-xl bg-[#56323E] px-4 py-3.5 font-bold text-white hover:bg-[#432634] transition-all shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:shadow-none disabled:transform-none flex items-center justify-center gap-2 cursor-pointer"
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
                  className="text-xs font-bold text-[#56323E] dark:text-[#EFDFD2] hover:underline"
                >
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right Column: Hero Showcase */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-[#56323E]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#56323E] to-slate-900/80 z-10 mix-blend-multiply" />
        <img
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920"
          alt="Grocery store interior"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent z-10" />

        <div className="absolute bottom-0 left-0 p-16 z-20 w-full max-w-2xl">
          <div className="inline-flex items-center gap-0 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-[#EFDFD2] mb-4">
            <span>🛡️ Owner Account Security</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
            Protecting your store <br />and business data.
          </h2>
          <p className="text-[#EFDFD2] text-lg leading-relaxed font-medium max-w-lg">
            Encrypted recovery links ensure only authorized store owners and operators can access management tools and analytics.
          </p>
        </div>
      </div>
    </main>
  );
}
