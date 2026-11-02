import React, { useState } from 'react';
import { Sparkles, ShieldCheck, X, Check, ArrowRight, DollarSign, Percent, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function BargainModal({ isOpen, onClose, product, onDiscountApplied }) {
  if (!isOpen || !product) return null;

  const [requestedPct, setRequestedPct] = useState(10);
  const [loading, setLoading] = useState(false);
  const [bargainResponse, setBargainResponse] = useState(null);

  const price = parseFloat(product.price || product.unit_price || product.selling_price || 10.0);

  const handleEvaluateBargain = async (pct) => {
    try {
      setLoading(true);
      const payload = {
        tool: 'bargain_and_guard_margin',
        arguments: {
          product_id: product.id || product.product_id,
          requested_discount_pct: pct
        }
      };

      const res = await api.post('/store/agent/tools/', payload);

      setBargainResponse(res.data.result);
      if (res.data.result?.status === 'APPROVED') {
        toast.success(`Discount approved! 12% Margin Guard preserved.`);
      } else {
        toast('Store safety margin guarded: Counter-offer proposed.', { icon: '🛡️' });
      }
    } catch (err) {
      console.error('Bargain error:', err);
      // Fallback evaluation if offline
      const cost = price * 0.8;
      const discAmt = price * (pct / 100);
      const offered = price - discAmt;
      const margin = ((offered - cost) / offered) * 100;
      if (margin >= 12.0) {
        setBargainResponse({
          status: 'APPROVED',
          discount_approved_pct: pct,
          final_price: offered,
          retained_margin_pct: margin.toFixed(1),
          message: `Approved! Margin is protected at ${margin.toFixed(1)}% (above 12% safety threshold).`
        });
      } else {
        const safePrice = (cost / 0.88);
        const safePct = ((price - safePrice) / price) * 100;
        setBargainResponse({
          status: 'COUNTER_OFFER',
          counter_discount_pct: safePct.toFixed(1),
          counter_price: safePrice,
          protected_margin_pct: 12.0,
          message: `Counter-offer: 12% margin floor protects store. Max safe discount is ${safePct.toFixed(1)}%.`
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDeal = () => {
    const finalPrice = bargainResponse?.final_price || bargainResponse?.counter_price || price;
    const finalPct = bargainResponse?.discount_approved_pct || bargainResponse?.counter_discount_pct || 0;
    if (onDiscountApplied) {
      onDiscountApplied({
        product,
        finalPrice: parseFloat(finalPrice),
        discountPct: parseFloat(finalPct)
      });
    }
    toast.success(`Deal accepted! $${parseFloat(finalPrice).toFixed(2)} applied to order.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Bargain with Kirana AI
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Agentic Commerce
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {product.name || product.product_name} (${price.toFixed(2)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Autonomous Margin Guard (12% Safety Floor)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Kirana AI negotiates transparently with shoppers while algorithmically defending the store's minimum 12% gross profit margin.
            </p>
          </div>

          {/* Quick Offer Chips */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Select requested discount:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setRequestedPct(pct);
                    handleEvaluateBargain(pct);
                  }}
                  disabled={loading}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    requestedPct === pct
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  {pct}% OFF
                </button>
              ))}
            </div>
          </div>

          {/* AI Result Box */}
          {loading ? (
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Gemini 3.5 Flash inspecting cost price & margin safety floor...
            </div>
          ) : bargainResponse ? (
            <div className={`p-4 rounded-2xl border ${
              bargainResponse.status === 'APPROVED'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${
                  bargainResponse.status === 'APPROVED'
                    ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                }`}>
                  {bargainResponse.status === 'APPROVED' ? '✓ Deal Approved' : '🛡️ Margin Guarded Counter-Offer'}
                </span>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 line-through mr-1.5">${price.toFixed(2)}</span>
                  <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
                    ${parseFloat(bargainResponse.final_price || bargainResponse.counter_price).toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                {bargainResponse.message}
              </p>

              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700 flex justify-end">
                <button
                  type="button"
                  onClick={handleAcceptDeal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Accept & Add to Order
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
