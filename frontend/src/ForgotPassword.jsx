import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './services/api';
import { ArrowLeft, Mail, ExternalLink, CheckCircle2, KeyRound, Link2, ShieldCheck } from 'lucide-react';

import { getEmailProviderUrl, getEmailProviderName } from './utils/emailProvider';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('link'); // 'link' (default) | 'otp'
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await api.post('/auth/password-reset/', { 
        email: email.trim(),
        method,
        portal: 'customer'
      });
      const msg = typeof res.data === 'string' ? res.data : (res.data?.message || 'Password reset instructions have been sent.');
      setStatus('success');
      setMessage(String(msg));

      // If user chose OTP, automatically navigate to OTP entry screen after 1.5s
      if (method === 'otp') {
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email.trim())}&mode=otp`);
        }, 1500);
      }
    } catch (err) {
      setStatus('error');
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || errData?.message || '');
      setMessage(String(errMsg || (err.response ? 'Server (' + err.response.status + ')' : 'Network Error') || 'Something went wrong.'));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Clean Branded Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0d1322]/90 backdrop-blur-xl sticky top-0 z-30 shadow-xs">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-xl sm:text-2xl font-black tracking-tight hover:opacity-85 transition">
            <span className="text-slate-900 dark:text-white">Narendra</span>
            <span className="text-primary-600 dark:text-primary-400">Kirana</span>
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-md px-4 py-8 sm:py-12 my-auto">

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl">
              <Mail size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Reset Password</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Narendra Kirana Account Recovery</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Select your preferred recovery method and enter your registered email address to receive recovery instructions.
          </p>

          {status === 'success' ? (
            <div className="space-y-4 pt-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {method === 'link' ? 'Reset Link Dispatched!' : '6-Digit OTP Dispatched!'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">{message}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5 font-bold">
                    ⏱ Valid for 15 minutes &bull; Single-use security token
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {method === 'link' ? (
                  <>
                    <a
                      href={getEmailProviderUrl(email)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] text-sm"
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
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 font-bold transition-all text-xs"
                    >
                      <KeyRound size={14} />
                      <span>Didn't get an email? Try 6-Digit OTP instead</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to={`/reset-password?email=${encodeURIComponent(email)}&mode=otp`}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] text-sm"
                  >
                    <KeyRound size={16} />
                    <span>Enter 6-Digit OTP Code Now →</span>
                  </Link>
                )}

                <Link
                  to="/login"
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-all"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              {status === 'error' && (
                <div className="mb-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-3 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/50">
                  {message}
                </div>
              )}

              {/* Recovery Method Selection */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  Select Recovery Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Email Reset Link (Default / Recommended) */}
                  <button
                    type="button"
                    onClick={() => setMethod('link')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 relative ${
                      method === 'link'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${method === 'link' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                          <Link2 size={16} />
                        </div>
                        <span className={`text-xs font-extrabold ${method === 'link' ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>
                          Reset Link
                        </span>
                      </div>
                      <span className="text-[9px] font-extrabold tracking-tight uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        Default
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1">
                      1-click recovery button sent to your inbox
                    </span>
                  </button>

                  {/* Option 2: 6-Digit OTP */}
                  <button
                    type="button"
                    onClick={() => setMethod('otp')}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                      method === 'otp'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${method === 'otp' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        <KeyRound size={16} />
                      </div>
                      <span className={`text-xs font-extrabold ${method === 'otp' ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>
                        6-Digit OTP
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1">
                      Instant code to reset here in browser
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 pl-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm shadow-sm"
                    placeholder="name@example.com"
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  We'll dispatch {method === 'link' ? 'a 1-click password reset link' : 'a 6-digit verification code'} to this inbox.
                </span>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="mt-6 w-full py-3.5 rounded-xl bg-indigo-600 font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-indigo-600/25 text-sm cursor-pointer"
              >
                {status === 'loading' ? 'Dispatching Instructions...' : (method === 'link' ? 'Send Password Reset Link' : 'Send 6-Digit OTP Code')}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Clean Security Footer */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800/60 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>256-Bit SSL Encrypted &bull; Narendra Kirana Security</span>
        </div>
      </footer>
    </div>
  );
}
