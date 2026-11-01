import React, { useState } from 'react';
import { Send, Image, Link as LinkIcon, Bell, Sparkles, CheckCircle2, AlertCircle, Phone, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export function NotificationsBroadcast() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('PROMO');
  const [actionUrl, setActionUrl] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Please enter notification title and message.');
      return;
    }

    setSending(true);
    try {
      const res = await api.post('/notifications/owner/broadcast/', {
        title: title.trim(),
        message: message.trim(),
        image_url: imageUrl.trim(),
        category,
        action_url: actionUrl.trim(),
      });
      toast.success(res.data?.detail || 'Push notification broadcast dispatched!');
      setTitle('');
      setMessage('');
      setImageUrl('');
      setActionUrl('');
    } catch (err) {
      console.error('Broadcast failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to dispatch push notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Rich Push Notification Broadcast
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Dispatch instant high-conversion push alerts with images, offers, and deep links directly to customer mobile devices.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Broadcast Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
          <form onSubmit={handleSendBroadcast} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Category / Badge Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'PROMO', label: '🔥 Offer / Deal', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300' },
                  { id: 'ORDER', label: '📦 Order Status', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300' },
                  { id: 'WALLET', label: '💳 Payment', color: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300' },
                  { id: 'SYSTEM', label: '📢 System Alert', color: 'border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300' },
                ].map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      category === cat.id ? `${cat.color} ring-2 ring-emerald-500/20 shadow-xs` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Push Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ⚡ Mega Weekend Atta & Rice Sale!"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Push Message Body <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Flat 30% OFF on Aashirvaad 5kg Atta today only. Tap to order before stock runs out!"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Rich Banner Image URL (Optional)</span>
                <span className="text-[10px] text-emerald-600 font-semibold lowercase">https://... png/jpg</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1542838132-92c53300491e"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <Image className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Target Deep Link Target (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="e.g. /product/12 or /orders/5"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={sending || !title.trim() || !message.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] font-black text-white text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching Broadcast...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Push Notification Broadcast
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Device Notification Mock Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Live Device Push Preview
              </span>
              <span className="text-[10px] text-slate-400 font-mono">iOS & Android Lockscreen</span>
            </div>

            {/* Lockscreen Card Mock */}
            <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/80 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-black">
                    NK
                  </div>
                  <span className="text-xs font-bold text-slate-200">Narendra Kirana</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">now</span>
              </div>

              <div>
                <p className="text-sm font-extrabold text-white leading-tight">
                  {title || '🔥 Exclusive Offer Banner Title'}
                </p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {message || 'Notification description text will appear right here when dispatched.'}
                </p>
              </div>

              {/* Rich Image Preview */}
              {imageUrl ? (
                <div className="rounded-xl overflow-hidden h-36 bg-slate-950 relative border border-slate-700">
                  <img src={imageUrl} alt="Notification preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              ) : null}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Category: <strong className="text-white">{category}</strong></span>
              <span>Action: <strong className="text-emerald-400">{actionUrl || 'Default App Open'}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
