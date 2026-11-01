import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Phone, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../services/api';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import GoogleIcon from '../../components/GoogleIcon';
import AnimatedAuthBackground from '../../components/auth/AnimatedAuthBackground';

export function CustomerLoginPage() {
  const navigate = useNavigate();
  const { syncUser } = useCart();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const rawRedirect = searchParams.get('redirect') || location.state?.from?.pathname || '/';
  let redirectTarget = '/';
  try {
    const decoded = decodeURIComponent(rawRedirect).trim();
    if (
      decoded.startsWith('/') &&
      !decoded.startsWith('//') &&
      !decoded.startsWith('/login') &&
      !decoded.startsWith('/signup')
    ) {
      redirectTarget = decoded;
    }
  } catch {
    redirectTarget = '/';
  }

  const [referralCode, setReferralCode] = useState(
    (searchParams.get('ref') || searchParams.get('code') || searchParams.get('referral_code') || '').trim().toUpperCase()
  );
  const [referrerName, setReferrerName] = useState('');
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Modal for mandatory mobile number on signup
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [pendingCredential, setPendingCredential] = useState(null);
  const [submittingPhone, setSubmittingPhone] = useState(false);

  // Look up referrer name if referral code exists, or try IP attribution
  useEffect(() => {
    if (referralCode) {
      fetchReferralLookup(referralCode);
    } else {
      api.get('/auth/referral-lookup/?ip=true')
        .then((res) => {
          if (res.data?.referral_code) {
            setReferralCode(res.data.referral_code);
            setReferrerName(res.data.referrer_name || '');
          }
        })
        .catch(() => {});
    }
  }, [referralCode]);

  const fetchReferralLookup = (code) => {
    if (!code) return;
    api.get(`/auth/referral-lookup/?code=${encodeURIComponent(code)}`)
      .then((res) => {
        if (res.data?.referrer_name) {
          setReferrerName(res.data.referrer_name);
        }
      })
      .catch(() => {});
  };

  const handleApplyInviteCode = (e) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;
    setReferralCode(clean);
    fetchReferralLookup(clean);
    setShowInviteInput(false);
    setManualCode('');
  };

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const payload = {
          credential: tokenResponse.access_token,
          token_type: 'access_token',
        };
        if (referralCode) {
          payload.referral_code = referralCode;
        }

        const res = await api.post('/auth/google/customer/', payload);
        const data = res.data;

        if (data.requires_mobile) {
          setPendingCredential(tokenResponse.access_token);
          if (data.referral_code && !referralCode) {
            setReferralCode(data.referral_code);
            fetchReferralLookup(data.referral_code);
          }
          setShowMobileModal(true);
          return;
        }

        completeLogin(data);
      } catch (err) {
        setError(err.response?.data?.detail || err.response?.data?.error || 'Sign in failed.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Google Sign-In was cancelled.');
    }
  });

  const handleMobileSubmit = async (e) => {
    e.preventDefault();
    const clean = mobileNumber.replace(/\D/g, '');
    let digits = clean;
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    if (digits.length !== 10 || !['6', '7', '8', '9'].includes(digits[0])) {
      setMobileError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setMobileError('');
    setSubmittingPhone(true);

    try {
      const payload = {
        credential: pendingCredential,
        token_type: 'access_token',
        mobile_number: digits,
      };
      if (referralCode) {
        payload.referral_code = referralCode;
      }

      const res = await api.post('/auth/google/customer/', payload);
      setShowMobileModal(false);
      completeLogin(res.data);
    } catch (err) {
      setMobileError(err.response?.data?.detail || err.response?.data?.error || 'Failed to verify phone number.');
    } finally {
      setSubmittingPhone(false);
    }
  };

  const completeLogin = (data) => {
    localStorage.setItem('smart-kirana-customer-token', data.access);
    localStorage.setItem('smart-kirana-customer-refresh', data.refresh);
    localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data.user));
    syncUser();
    toast.success('Signed in successfully');
    navigate(redirectTarget, { replace: true });
  };

  return (
    <CustomerLayout>
      <div className="relative min-h-[calc(100vh-140px)] flex flex-col justify-center items-center px-4 py-12">
        {/* Ambient Hairline SVG Background */}
        <AnimatedAuthBackground />

        {/* Back Button (Apple-style circular glass) */}
        <div className="w-full max-w-sm mb-6 z-10">
          <Link
            to="/"
            className="size-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs hover:scale-105 active:scale-95"
            aria-label="Back to store"
          >
            <ArrowLeft size={15} />
          </Link>
        </div>

        {/* Unboxed Fluid Centerpiece */}
        <div className="w-full max-w-xs flex flex-col items-center text-center z-10">
          {/* 64px Squircle Brand Mark */}
          <div className="size-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 shadow-md flex items-center justify-center mb-4 transition-transform hover:scale-102">
            <img src="/logo-transparent.png" alt="Narendra Kirana" className="w-full h-full object-contain" />
          </div>

          {/* Typography */}
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Narendra <span className="text-red-600">Kirana</span>
          </h1>

          {/* Contextual Subline (Only if redirected from cart/checkout) */}
          {redirectTarget !== '/' && (
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight">
              {redirectTarget.includes('checkout') ? 'Complete checkout' : 'Sign in to continue'}
            </p>
          )}

          {/* Frosted Micro-Pill for Referral (No clunky green boxes) */}
          {referralCode && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <span>Invited by {referrerName || referralCode}</span>
              <button
                type="button"
                onClick={() => { setReferralCode(''); setReferrerName(''); }}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white p-0.5"
                title="Remove invite"
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mt-4 w-full rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 p-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Hero Action: Precision Google Sign-In Button */}
          <div className="mt-6 w-full">
            <button
              type="button"
              disabled={googleLoading}
              onClick={() => handleGoogleSignIn()}
              className="w-full h-12 flex items-center justify-center gap-3 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-all duration-200 text-sm font-bold text-slate-800 dark:text-slate-100 shadow-xs hover:shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <GoogleIcon />
              <span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Inline Invite Code Drawer */}
          {!referralCode && (
            <div className="mt-4 w-full">
              {!showInviteInput ? (
                <button
                  type="button"
                  onClick={() => setShowInviteInput(true)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  Invite code
                </button>
              ) : (
                <form onSubmit={handleApplyInviteCode} className="mt-2 flex items-center justify-center gap-2">
                  <input
                    type="text"
                    placeholder="CODE"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    autoFocus
                    className="w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs uppercase font-mono font-bold tracking-wider focus:outline-emerald-500 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 dark:bg-slate-100 px-3 py-1 text-xs font-bold text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteInput(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X size={13} />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Clean Footer */}
          <p className="mt-10 text-[11px] font-medium text-slate-400 tracking-tight">
            Terms • Privacy
          </p>
        </div>

        {/* High-End Mobile Verification Modal */}
        {showMobileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                    <Phone size={14} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Phone number</h3>
                    <p className="text-[11px] text-slate-400">Required for delivery</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X size={15} />
                </button>
              </div>

              {referralCode && (
                <div className="mb-3 rounded-md bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Invited by {referrerName || referralCode}
                </div>
              )}

              {mobileError && (
                <div className="mb-3 rounded-md bg-rose-50 dark:bg-rose-950/50 p-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {mobileError}
                </div>
              )}

              <form onSubmit={handleMobileSubmit} className="space-y-4">
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600">
                  <span className="text-xs font-bold text-slate-400 mr-2">+91</span>
                  <input
                    type="tel"
                    autoFocus
                    maxLength={10}
                    placeholder="98765 43210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 bg-transparent"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMobileModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPhone || mobileNumber.length !== 10}
                    className="flex-1 rounded-xl bg-slate-900 dark:bg-slate-100 py-2.5 text-xs font-bold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {submittingPhone ? 'Saving...' : 'Continue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

export default CustomerLoginPage;
