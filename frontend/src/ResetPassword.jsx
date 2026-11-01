import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Smartphone, ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck, ArrowRight, RefreshCw, ShoppingBasket } from 'lucide-react';
import { usePasswordReset } from './hooks/usePasswordReset';

export function ResetPassword() {
  const {
    mode,
    setMode,
    email,
    setEmail,
    isEditingEmail,
    setIsEditingEmail,
    otp,
    setOtp,
    otpStep,
    setOtpStep,
    otpRefs,
    otpVerified,
    isVerifyingOtp,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    status,
    setStatus,
    message,
    setMessage,
    resendCooldown,
    isResending,
    tokenStatus,
    tokenError,
    uid,
    token,
    handleSendOtp,
    handleVerifyOtp,
    handleOtpChange,
    handleKeyDown,
    handlePaste,
    submit,
  } = usePasswordReset({ portal: 'customer', loginRedirect: '/login' });

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const appSchemeUrl = uid && token ? `smartkirana://reset-password?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}` : '';

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
        {/* Mobile App First Banner */}
        {isMobile && uid && token && mode === 'link' && tokenStatus === 'valid' && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white shadow-lg border border-emerald-500/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl shrink-0 backdrop-blur-sm">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Narendra Kirana App</h3>
                  <p className="text-xs text-emerald-100">Reset password directly in the mobile app</p>
                </div>
              </div>
              <a
                href={appSchemeUrl}
                className="px-3.5 py-2 bg-white text-emerald-800 text-xs font-extrabold rounded-xl shadow hover:bg-emerald-50 active:scale-95 transition-all shrink-0"
              >
                Open App
              </a>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl">
              {mode === 'otp' && otpStep === 'verify' ? <ShieldCheck size={24} /> : <Lock size={24} />}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {mode === 'otp' && otpStep === 'verify' ? 'Verify Code' : 'Create New Password'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'otp' && otpStep === 'verify' ? 'Step 1: Identity Confirmation' : 'Step 2: Account Security'}
              </p>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
            {mode === 'otp' && otpStep === 'verify'
              ? 'Enter the 6-digit verification code sent to your email to verify your identity.'
              : 'Choose a strong password (minimum 8 characters) to secure your account.'}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-6 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => { setMode('link'); setStatus('idle'); setMessage(''); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mode === 'link'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Mail size={14} /> Email Reset Link
            </button>
            <button
              type="button"
              onClick={() => { setMode('otp'); setStatus('idle'); setMessage(''); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mode === 'otp'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <KeyRound size={14} /> 6-Digit OTP Code
            </button>
          </div>

          {status === 'success' ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 font-medium text-center animate-in fade-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <p className="font-extrabold text-lg text-slate-900 dark:text-white">Password Changed Successfully!</p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">{message}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Redirecting to login in 3 seconds...</p>
              <Link 
                to="/login" 
                className="mt-4 inline-block px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md"
              >
                Sign In Now →
              </Link>
            </div>
          ) : (
            <div>
              {status === 'error' && (
                <div className="mb-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-3.5 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/50">
                  {message}
                </div>
              )}

              {/* LINK MODE WARNINGS */}
              {mode === 'link' && tokenStatus === 'invalid' && (
                <div className="mb-5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 p-4 rounded-xl text-xs border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <p className="font-bold text-sm">⚠️ Link Expired or Already Used</p>
                  <p>{tokenError || 'This password reset link is invalid or has expired.'}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('otp')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs"
                    >
                      Enter 6-Digit OTP Instead
                    </button>
                    <Link
                      to="/forgot-password"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-300"
                    >
                      Request New Link
                    </Link>
                  </div>
                </div>
              )}

              {mode === 'link' && (!uid || !token) && (
                <div className="mb-5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 p-4 rounded-xl text-xs border border-amber-200 dark:border-amber-900/50">
                  Missing reset tokens in URL. Click the link sent to your email or switch to the <strong>"6-Digit OTP Code"</strong> tab.
                </div>
              )}

              {/* OTP MODE: STEP 1 - VERIFY CODE ONLY */}
              {mode === 'otp' && otpStep === 'verify' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-black tracking-wide rounded-md border border-emerald-200 dark:border-emerald-800 uppercase">
                      Step 1 of 2: Verify Code
                    </span>
                  </div>

                  {/* Email Destination Display */}
                  {email && !isEditingEmail ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-[11px] text-slate-400 block font-semibold">Code sent to:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate block">{email}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(true)}
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-2 shrink-0 text-xs"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Registered Email Address
                      </label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm"
                          placeholder="you@example.com"
                        />
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isResending || !email.trim()}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          {isResending ? 'Sending...' : 'Send Code'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6-Digit OTP Code Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      6-Digit Security OTP
                    </label>
                    <input
                      required
                      autoFocus
                      type="text"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition text-center tracking-[0.5em] font-mono text-2xl font-extrabold"
                      placeholder="123456"
                    />
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Valid for 15 minutes.</span>
                      {resendCooldown > 0 ? (
                        <span className="font-semibold text-slate-400">Resend in {resendCooldown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isResending || !email.trim()}
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                        >
                          <RefreshCw size={11} className={isResending ? 'animate-spin' : ''} />
                          <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || !email.trim() || otp.trim().length !== 6}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-indigo-600/25 text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isVerifyingOtp ? (
                      'Verifying Code...'
                    ) : (
                      <>
                        <span>Verify Code</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2 (FOR OTP) OR DIRECT FORM (FOR VALID LINK) */}
              {((mode === 'otp' && otpStep === 'set_password') || mode === 'link') && (
                <form onSubmit={submit} className="space-y-4">
                  {mode === 'otp' && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-black tracking-wide rounded-md border border-emerald-200 dark:border-emerald-800 uppercase">
                          Step 2 of 2: Create New Password
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Identity verified for <strong>{email}</strong></span>
                      </div>
                    </>
                  )}

                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    New Password
                    <div className="relative mt-1">
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-normal"
                        placeholder="Minimum 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>

                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Confirm Password
                    <div className="relative mt-1">
                      <input
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-normal"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <span className="text-[11px] text-red-500 font-semibold block mt-1">
                        ✕ Passwords do not match
                      </span>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                        ✓ Passwords match
                      </span>
                    )}
                  </label>

                  <button
                    type="submit"
                    disabled={status === 'loading' || (mode === 'link' && (!uid || !token || tokenStatus === 'invalid')) || password.length < 8 || password !== confirmPassword}
                    className="mt-6 w-full py-3.5 rounded-xl bg-indigo-600 font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-indigo-600/25 text-sm cursor-pointer"
                  >
                    {status === 'loading' ? 'Saving Password...' : 'Save & Set New Password'}
                  </button>
                </form>
              )}

              <div className="mt-4 text-center">
                <Link to="/forgot-password" className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">
                  Need a new OTP or reset link? Request again
                </Link>
              </div>
            </div>
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

