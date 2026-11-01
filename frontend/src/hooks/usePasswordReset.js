import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export function usePasswordReset({ portal = 'customer', loginRedirect = '/login' } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';
  const modeParam = searchParams.get('mode') || (uid && token ? 'link' : 'otp');

  const [mode, setMode] = useState(modeParam); // 'link' | 'otp'
  const [email, setEmail] = useState(emailParam);
  const [isEditingEmail, setIsEditingEmail] = useState(!emailParam);
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState('verify'); // 'verify' | 'set_password'
  const [otpVerified, setOtpVerified] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Proactive token health state for link mode
  const [tokenStatus, setTokenStatus] = useState(uid && token ? 'checking' : 'none'); // 'none' | 'checking' | 'valid' | 'invalid'
  const [tokenError, setTokenError] = useState('');

  const otpRefs = useRef([]);

  // Proactive Service Worker cleanup
  useEffect(() => {
    sessionStorage.removeItem('vite_preload_reload_count');
    sessionStorage.removeItem('lazy_chunk_retry_count');
    sessionStorage.removeItem('eb_chunk_reload_count');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.update().catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Validate token if in link mode
  useEffect(() => {
    if (uid && token) {
      let isMounted = true;
      setTokenStatus('checking');
      api.post('/auth/password-reset/validate-token/', { uid, token, portal })
        .then((res) => {
          if (!isMounted) return;
          setTokenStatus('valid');
          if (res.data?.email) {
            setEmail((prev) => prev || res.data.email);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setTokenStatus('invalid');
          const errData = err.response?.data;
          const errMsg = typeof errData === 'string' ? errData : (errData?.error || 'This reset link has expired or has already been used.');
          setTokenError(String(errMsg));
        });
      return () => { isMounted = false; };
    }
  }, [uid, token, portal]);

  async function handleSendOtp() {
    if (!email.trim()) {
      setStatus('error');
      setMessage(`Please enter your ${portal === 'owner' ? 'registered owner' : 'account'} email address.`);
      return;
    }
    setIsResending(true);
    setStatus('idle');
    setMessage('');
    try {
      const res = await api.post('/auth/password-reset/', {
        email: email.trim(),
        method: 'otp',
        portal
      });
      setMessage(res.data?.message || 'A 6-digit verification code has been sent to your email.');
      setResendCooldown(60);
      setIsEditingEmail(false);
    } catch (err) {
      setStatus('error');
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || 'Failed to send OTP code.');
      setMessage(String(errMsg));
    } finally {
      setIsResending(false);
    }
  }

  // Verify OTP code
  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setStatus('error');
      setMessage(`Please enter your ${portal === 'owner' ? 'registered owner' : 'account'} email address.`);
      return;
    }
    const cleanOtp = otp.trim().replace(/[^0-9]/g, '');
    if (cleanOtp.length !== 6) {
      setStatus('error');
      setMessage('Please enter the valid 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setStatus('idle');
    setMessage('');
    try {
      const res = await api.post('/auth/password-reset/verify-otp/', {
        email: email.trim(),
        otp: cleanOtp,
        portal
      });
      if (res.data?.valid) {
        setOtpVerified(true);
        setOtpStep('set_password');
        setStatus('idle');
        setMessage('Code verified! Please create your new secure password below.');
      } else {
        setStatus('error');
        setMessage(res.data?.error || 'Invalid verification code.');
      }
    } catch (err) {
      setStatus('error');
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || 'Incorrect or expired verification code.');
      setMessage(String(errMsg));
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  function handleOtpChange(index, val) {
    const digits = val.replace(/\D/g, '');
    const currentArr = otp.split('');
    currentArr[index] = digits ? digits.slice(-1) : '';
    const newOtp = currentArr.join('');
    setOtp(newOtp);

    if (digits && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    setOtp(pasted);
    const targetIdx = Math.min(pasted.length, 5);
    if (otpRefs.current[targetIdx]) {
      otpRefs.current[targetIdx].focus();
    }
  }

  // Step 2 (or Link mode): Set New Password
  async function submit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      if (mode === 'otp') {
        const res = await api.post('/auth/password-reset/otp-confirm/', {
          email: email.trim(),
          otp: otp.trim(),
          new_password: password,
          portal
        });
        setStatus('success');
        setMessage(res.data?.message || 'Password reset successfully!');
        setTimeout(() => navigate(loginRedirect), 3000);
      } else {
        if (!uid || !token) {
          setStatus('error');
          setMessage('Invalid or missing reset link. Please use the 6-Digit OTP tab or request a new link.');
          return;
        }

        const res = await api.post('/auth/password-reset-confirm/', { 
          uid, 
          token, 
          new_password: password,
          portal
        });
        setStatus('success');
        setMessage(res.data?.message || 'Password reset successfully!');
        setTimeout(() => navigate(loginRedirect), 3000);
      }
    } catch (err) {
      setStatus('error');
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || errData?.message || '');
      setMessage(String(errMsg || (err.response ? 'Server Error (' + err.response.status + ')' : err.message) || 'Failed to reset password.'));
    }
  }

  return {
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
  };
}
