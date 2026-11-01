import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Tag, Copy, Check, ShoppingBag, Calendar, AlertCircle, ShoppingCart, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function OffersPromoCodes() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/offers/promocodes/');
      const data = res.data?.results || res.data;
      if (Array.isArray(data)) {
        // Only show active codes
        setPromos(data.filter((p) => p.is_active !== false));
      } else {
        setPromos([]);
      }
    } catch (err) {
      console.error('Failed to load promo codes', err);
      setPromos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCode(code);
      toast.success(t('Coupon Copied Toast') || 'Coupon copied!');
      setTimeout(() => {
        setCopiedCode(null);
      }, 2500);
    } catch {
      toast.error('Could not copy coupon code');
    }
  };

  const formatExpiry = (dateStr) => {
    if (!dateStr) return t('No Expiry');
    try {
      const date = new Date(dateStr);
      return `${t('Valid Till')}: ${date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`;
    } catch {
      return t('No Expiry');
    }
  };

  const formatDiscountBadge = (promo) => {
    const val = parseFloat(promo.discount_value) || 0;
    if (promo.discount_type === 'PERCENTAGE') {
      return `${val}% OFF`;
    }
    return `FLAT ₹${val} OFF`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <Link
          to="/profile"
          className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-3"
        >
          <ChevronRight className="rotate-180" size={16} />
          {t('Back to Dashboard')}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
            <Tag size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('Available Offers')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('Available Offers Subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4"
            >
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && promos.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Percent size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            {t('No Promo Codes Available')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            {t('No Promo Codes Desc')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <ShoppingBag size={16} /> {t('Shop Groceries')}
          </button>
        </div>
      )}

      {/* Promo Cards Grid */}
      {!loading && promos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {promos.map((promo) => {
            const isCopied = copiedCode === promo.code;
            const minSpend = parseFloat(promo.min_order_amount) || 0;
            const badgeText = formatDiscountBadge(promo);
            const expiryText = formatExpiry(promo.expiration_date);

            return (
              <div
                key={promo.id || promo.code}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Top Accent Strip */}
                <div className="h-2 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500" />

                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Discount Badge & Type */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 font-black text-sm tracking-tight border border-rose-200/60 dark:border-rose-900/60">
                        <Tag size={14} />
                        {badgeText}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                        {t('Apply at Checkout')}
                      </span>
                    </div>

                    {/* Coupon Code Pill with Copy Action */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 dark:text-white tracking-widest text-base sm:text-lg">
                          {promo.code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(promo.code)}
                        className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                          isCopied
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 shadow-sm'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} strokeWidth={3} /> {t('Copied')}
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> {t('Copy Code')}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="mt-3.5 space-y-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {minSpend > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {t('Min Order')}:
                          </span>
                          <span>₹{minSpend}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{expiryText}</span>
                      </div>
                      {promo.applicable_category && (
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <AlertCircle size={13} />
                          <span>
                            {t('Applicable On Category', {
                              category: promo.applicable_category_name || 'selected category',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Shop Now & Go to Cart */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/products')}
                      className="cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
                    >
                      <ShoppingBag size={14} /> {t('Shop Now')}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/cart')}
                      className="cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                    >
                      <ShoppingCart size={14} /> {t('Go to Cart')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
