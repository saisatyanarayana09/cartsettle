import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ShieldCheck, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'ASkjGQlH18H3ZtMpjKjAubYqkm1GlNbWbuiy2pYJTew6DnUgEcwNSamjCBokeZ3SrPwwc625VgtLMAB6';

export default function PayPalAuthorizeButton({
  amount,
  currency = 'USD',
  onAuthorized,
  disabled = false,
  description = 'CartSettle Kirana Order'
}) {
  const [loading, setLoading] = useState(false);
  const [authorizedId, setAuthorizedId] = useState(null);

  const initialOptions = {
    'client-id': PAYPAL_CLIENT_ID,
    currency: currency,
    intent: 'authorize', // CRUCIAL for CartSettle Dynamic Capture
    components: 'buttons'
  };

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
      
      const res = await axios.post(
        `${apiBase}/orders/create_paypal_order/`,
        { amount: amount, currency: currency, description: description },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data && res.data.id) {
        return res.data.id;
      }
      throw new Error('No Order ID returned from PayPal service');
    } catch (err) {
      console.error('Error creating PayPal Order:', err);
      toast.error(err.response?.data?.detail || 'Failed to initialize PayPal authorization.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (data, actions) => {
    try {
      setLoading(true);
      const paypalOrderId = data.orderID;
      setAuthorizedId(paypalOrderId);
      toast.success('PayPal Pre-Authorization successful! Authorizing payment hold...');
      
      if (onAuthorized) {
        await onAuthorized(paypalOrderId);
      }
    } catch (err) {
      console.error('Error approving PayPal authorization:', err);
      toast.error(err.message || 'Authorization failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-linear-to-br from-indigo-50/70 via-white to-amber-50/50 dark:from-slate-900/60 dark:via-slate-900 dark:to-slate-800/80 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 p-4 shadow-sm transition-all">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              CartSettle Auto-Settlement
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <Sparkles className="w-3 h-3 mr-1" /> Zero-Risk
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hold pre-authorized with PayPal: only packed items are charged.
            </p>
          </div>
        </div>
      </div>

      {/* Info Pill */}
      <div className="mb-4 text-xs bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
        <div>
          <span className="font-semibold">How it works: </span>
          PayPal places a temporary hold for <strong className="underline">${parseFloat(amount || 0).toFixed(2)}</strong>. When the store packs your bag, unavailable items are deducted and the difference is <em>instantly returned to your card/PayPal balance</em>.
        </div>
      </div>

      {/* PayPal Button Container */}
      <div className="relative">
        <PayPalScriptProvider options={initialOptions}>
          <PayPalButtons
            style={{
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'pay',
              height: 44
            }}
            disabled={disabled || loading}
            createOrder={handleCreateOrder}
            onApprove={handleApprove}
            onError={(err) => {
              console.error('PayPal Buttons Error:', err);
              toast.error('PayPal checkout error. Please try again.');
            }}
          />
        </PayPalScriptProvider>

        {loading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Securing PayPal Authorization...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
