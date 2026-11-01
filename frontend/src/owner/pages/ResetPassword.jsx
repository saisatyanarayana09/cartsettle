import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert, ShieldCheck, ArrowLeft, ArrowRight, KeyRound, Mail, RefreshCw } from 'lucide-react';
import { usePasswordReset } from '../../hooks/usePasswordReset';

export default function OwnerResetPassword() {
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
  } = usePasswordReset({ portal: 'owner', loginRedirect: '/owner/login' });

  const isLinkInvalid = mode === 'link' && (!uid || !token || tokenStatus === 'invalid');

  const handleSubmit = submit;

  return (
    <main className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Left Column: Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Back to Login link */}
          <Link
            to="/owner/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Back to Owner Sign In
          </Link>

          <div className="mb-6">
            <p className="text-sm font-black tracking-[0.2em] uppercase drop-shadow-sm mb-3 flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-md">
                <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </span>
              <span className="text-emerald-900 dark:text-emerald-400">NARENDRA</span>{' '}
              <span className="text-indigo-600 dark:text-indigo-400">KIRANA</span>
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {mode === 'otp' && otpStep === 'verify' ? 'Verify Code' : 'Create New Password'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              {mode === 'otp' && otpStep === 'verify'
                ? 'Enter the 6-digit code sent to your owner email to verify your identity.'
                : 'Choose a strong password (minimum 8 characters) for your owner account.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-6 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setMode('link'); setStatus('idle'); setMessage(''); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'link'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Mail size={14} /> Email Reset Link
            </button>
            <button
              type="button"
              onClick={() => { setMode('otp'); setStatus('idle'); setMessage(''); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'otp'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <KeyRound size={14} /> 6-Digit OTP Code
            </button>
          </div>

          {isLinkInvalid ? (
            <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center animate-in fade-in">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl flex items-center justify-center mx-auto mb-3">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-200 mb-2">
                Invalid or Expired Link
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed mb-4">
                {tokenError || 'This reset link is missing required security tokens or has expired. You can use your 6-Digit OTP code instead.'}
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMode('otp')}
                  className="block w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-sm cursor-pointer"
                >
                  Use 6-Digit OTP Instead
                </button>
                <Link
                  to="/owner/forgot-password"
                  className="block w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Request New Reset Link
                </Link>
              </div>
            </div>
          ) : status === 'success' ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200 mb-2">
                Password Reset Successful
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  to="/owner/login"
                  className="block w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-sm"
                >
                  Sign In with New Password
                </Link>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Redirecting to Owner Sign In in a few seconds...
                </p>
              </div>
            </div>
          ) : (
            <div>
              {status === 'error' && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm font-bold text-red-700 dark:text-red-300 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
              )}

              {/* OTP MODE: STEP 1 - VERIFY CODE ONLY */}
              {mode === 'otp' && otpStep === 'verify' && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-black tracking-wide rounded-md border border-emerald-200 dark:border-emerald-800 uppercase">
                      Step 1 of 2: Verify Code
                    </span>
                  </div>

                  {/* Email Destination Display */}
                  {email && !isEditingEmail ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
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
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-2 shrink-0 text-xs cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="owner-email" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                        Owner Email Address
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            id="owner-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="owner@narendra-kirana.com"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 pl-10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                          />
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isResending || !email.trim()}
                          className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          {isResending ? 'Sending...' : 'Send Code'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6-Digit OTP Code Input */}
                  <div>
                    <label htmlFor="owner-otp" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      6-Digit Security OTP
                    </label>
                    <input
                      id="owner-otp"
                      type="text"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-center tracking-[0.5em] font-mono text-2xl font-extrabold"
                    />
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                      <span>Expires in 15 minutes.</span>
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
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-bold text-white hover:bg-indigo-700 transition-all shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:shadow-none disabled:transform-none flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying Code...
                      </>
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
                <form onSubmit={handleSubmit} className="space-y-5">
                  {mode === 'otp' && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-black tracking-wide rounded-md border border-emerald-200 dark:border-emerald-800 uppercase">
                          Step 2 of 2: Create New Password
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Owner identity verified for <strong>{email}</strong></span>
                      </div>
                    </>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="new-password" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 pl-11 pr-12 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                        />
                        <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 pl-11 pr-12 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                        />
                        <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs font-semibold text-red-500 mt-1.5 flex items-center gap-1">
                          <span>✕</span> Passwords do not match
                        </p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                          <span>✓</span> Passwords match
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading' || (mode === 'link' && isLinkInvalid) || password.length < 8 || password !== confirmPassword}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-bold text-white hover:bg-indigo-700 transition-all shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:shadow-none disabled:transform-none flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      'Reset & Save Password'
                    )}
                  </button>
                </form>
              )}
            </div>
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
            Security you can count on.
          </h2>
          <p className="text-indigo-100/80 text-lg leading-relaxed font-medium max-w-lg">
            Once updated, all previous login sessions for this account will be securely refreshed.
          </p>
        </div>
      </div>
    </main>
  );
}
