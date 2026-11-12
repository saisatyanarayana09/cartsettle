import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../cart-context';

export default function BargainModal({ isOpen, onClose, product, onDiscountApplied }) {
  const { applyDeal } = useCart() || {};
  const [selectedPct, setSelectedPct] = useState(10);
  const [customPct, setCustomPct] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen || !product) return null;

  const basePrice = parseFloat(product.price || product.unit_price || product.selling_price || 0);
  const activeDiscountPct = selectedPct > 0 ? selectedPct : 0;
  const currentOfferPrice = activeDiscountPct > 0 
    ? Math.max(1, Math.round(basePrice * (1 - activeDiscountPct / 100))) 
    : Math.round(basePrice);

  const handleSelectPct = (pct) => {
    setSelectedPct(pct);
    setCustomPct('');
    setResult(null);
  };

  const handleCustomPctChange = (e) => {
    const val = e.target.value;
    setCustomPct(val);
    setResult(null);
    if (val === '') {
      setSelectedPct(10);
      return;
    }
    const num = Math.min(90, Math.max(1, parseFloat(val) || 0));
    setSelectedPct(num);
  };

  const handleEvaluate = async () => {
    const pctToRequest = selectedPct > 0 ? selectedPct : 10;
    try {
      setLoading(true);
      const res = await api.post('/store/agent/tools/', {
        tool: 'bargain_and_guard_margin',
        arguments: {
          product_id: product.id || product.product_id,
          requested_discount_pct: pctToRequest,
        },
      });
      setResult(res.data.result);
    } catch (err) {
      console.error('Bargain error:', err);
      // Offline fallback
      const cost = basePrice * 0.8;
      const offered = currentOfferPrice;
      const margin = ((offered - cost) / offered) * 100;
      if (margin >= 12.0) {
        setResult({
          status: 'APPROVED',
          final_price: offered,
          savings: Math.max(0, basePrice - offered),
        });
      } else {
        const safePrice = Math.round(cost / 0.88);
        setResult({
          status: 'COUNTER_OFFER',
          counter_price: safePrice,
          final_price: safePrice,
          savings: Math.max(0, basePrice - safePrice),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    const finalPrice = result?.final_price || result?.counter_price || currentOfferPrice;
    try {
      if (result?.deal_token && applyDeal) {
        await applyDeal(result.deal_token);
      }
      if (onDiscountApplied) {
        await onDiscountApplied({
          product,
          finalPrice,
          dealToken: result?.deal_token,
        });
      }
      toast.success(`Offer applied: ₹${Number(finalPrice).toFixed(2)}`);
      onClose();
    } catch (err) {
      console.error('Deal accept error:', err);
      toast.error('Could not apply offer.');
    }
  };

  const approvedPrice = Number(result?.final_price || result?.counter_price || currentOfferPrice);
  const totalSavings = Number(result?.savings ?? Math.max(0, basePrice - approvedPrice));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[360px] bg-white dark:bg-[#15171C] rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Make an Offer</h3>
          <button
            type="button"
            onClick={onClose}
            className="size-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Product Row */}
        <div className="flex items-center justify-between py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
          <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
            {product.name || product.product_name}
          </span>
          <span className="text-[13px] font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            ₹{basePrice.toFixed(2)}
          </span>
        </div>

        {/* Offer Display */}
        <div className="text-center py-1">
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Your Offer
          </div>
          <div className="text-[32px] font-black text-slate-900 dark:text-white font-mono tracking-tight">
            ₹{currentOfferPrice}
          </div>
        </div>

        {/* Quick Discount Pills */}
        <div className="grid grid-cols-4 gap-1.5">
          {[5, 10, 15, 20].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handleSelectPct(pct)}
              className={`py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                !customPct && selectedPct === pct
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              -{pct}%
            </button>
          ))}
        </div>

        {/* Custom Discount Input */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-2">Custom</span>
          <div className="relative flex-1">
            <input
              type="number"
              min="1"
              max="90"
              placeholder="e.g. 12"
              value={customPct}
              onChange={handleCustomPctChange}
              className="w-full h-8 pl-3 pr-7 rounded-xl bg-white dark:bg-[#1C1E24] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1.5 focus:ring-slate-900 dark:focus:ring-white"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 pointer-events-none">
              %
            </span>
          </div>
        </div>

        {/* Result Badge */}
        {result && (
          <div
            className={`p-3 rounded-2xl border text-center transition-all ${
              result.status === 'APPROVED'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="text-xs font-bold">
              {result.status === 'APPROVED'
                ? 'Offer Accepted'
                : `Counter Offer · ₹${approvedPrice.toFixed(2)}`}
            </div>
            {totalSavings > 0 && (
              <div className="text-[11px] opacity-80 mt-0.5">
                Save ₹{totalSavings.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="pt-1">
          {!result ? (
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={loading}
              className="w-full h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                'Send Offer'
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="flex-1 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Adjust
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="flex-[2] h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="size-3.5" />
                Accept ₹{approvedPrice.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
