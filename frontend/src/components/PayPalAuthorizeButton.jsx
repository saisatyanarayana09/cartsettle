import React, { useState, useMemo } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const PAYPAL_CLIENT_ID =
  import.meta.env.VITE_PAYPAL_CLIENT_ID ||
  'ASkjGQlH18H3ZtMpjKjAubYqkm1GlNbWbuiy2pYJTew6DnUgEcwNSamjCBokeZ3SrPwwc625VgtLMAB6';

export default function PayPalAuthorizeButton({
  amount,
  currency = 'USD',
  onAuthorized,
  disabled = false,
  description = 'CartSettle Order'
}) {
  const [loading, setLoading] = useState(false);

  const initialOptions = useMemo(
    () => ({
      'client-id': PAYPAL_CLIENT_ID,
      clientId: PAYPAL_CLIENT_ID,
      currency: currency,
      intent: 'authorize',
      components: 'buttons',
      'disable-funding': 'card,credit,paylater',
      disableFunding: 'card,credit,paylater'
    }),
    [currency]
  );

  const handleCreateOrder = async () => {
    try {
      setLoading(true);
      const res = await api.post('/orders/create_paypal_order/', {
        amount: amount,
        currency: currency,
        description: description
      });

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

  const handleApprove = async (data) => {
    try {
      setLoading(true);
      const paypalOrderId = data.orderID;
      toast.success('PayPal authorization confirmed. Placing order...');

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
    <div className="relative z-0 isolate w-full rounded-[16px] bg-[#F5F5F7] dark:bg-[#2C2C2E] p-3.5 text-left border border-[#E5E5EA] dark:border-[#38383A] overflow-hidden">
      {/* Apple Pay Style Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-7 rounded-[9px] bg-[#0071E3]/10 dark:bg-[#0A84FF]/20 text-[#0071E3] dark:text-[#0A84FF] grid place-items-center shrink-0">
            <ShieldCheck size={15} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
              CartSettle Dynamic Hold
            </h4>
            <p className="text-[11px] text-[#86868B] truncate">
              Only packed items are captured on dispatch
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#34C759] text-[10px] font-semibold shrink-0">
          <CheckCircle2 size={11} />
          Zero-Risk
        </span>
      </div>

      {/* Isolated Stacking Container (z-0 isolate) prevents PayPal iframe from overlapping sticky bars on scroll */}
      <div className="relative z-0 isolate max-w-full overflow-hidden rounded-[12px]">
        <PayPalScriptProvider options={initialOptions}>
          <PayPalButtons
            fundingSource="paypal"
            style={{
              layout: 'vertical',
              color: 'gold',
              shape: 'pill',
              label: 'pay',
              height: 42,
              tagline: false
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
          <div className="absolute inset-0 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xs flex items-center justify-center rounded-[12px] z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              <div className="size-3.5 border-2 border-[#0071E3] border-t-transparent rounded-full animate-spin" />
              Authorizing PayPal...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
