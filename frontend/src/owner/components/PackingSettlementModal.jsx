import React, { useState, useMemo } from 'react';
import { 
  X, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  ArrowDownCircle, 
  Sparkles, 
  Package, 
  Minus, 
  Plus, 
  DollarSign, 
  CheckCircle2 
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function PackingSettlementModal({
  order,
  isOpen,
  onClose,
  onSettled
}) {
  if (!isOpen || !order) return null;

  const [itemsState, setItemsState] = useState(() => {
    return (order.items || []).map(item => ({
      id: item.id,
      name: item.product_name_snapshot,
      unit: item.unit_snapshot,
      price: parseFloat(item.price_snapshot || 0),
      cost: parseFloat(item.item_cost_price || item.price_snapshot * 0.8),
      ordered_qty: item.quantity,
      packed_qty: item.packed_quantity || item.quantity,
      is_accepted: item.status !== 'REJECTED' && item.is_packed !== false,
    }));
  });

  const [loading, setLoading] = useState(false);
  const [settlementReceipt, setSettlementReceipt] = useState(null);

  // Toggle item accepted / rejected
  const toggleItem = (index) => {
    setItemsState(prev => {
      const updated = [...prev];
      const target = updated[index];
      const nextAccepted = !target.is_accepted;
      target.is_accepted = nextAccepted;
      target.packed_qty = nextAccepted ? target.ordered_qty : 0;
      return updated;
    });
  };

  // Adjust packed quantity
  const updateQty = (index, delta) => {
    setItemsState(prev => {
      const updated = [...prev];
      const target = updated[index];
      const newQty = Math.max(0, Math.min(target.ordered_qty, target.packed_qty + delta));
      target.packed_qty = newQty;
      target.is_accepted = newQty > 0;
      return updated;
    });
  };

  // Compute live totals
  const { packedSubtotal, authorizedAmount, finalTotal, autoReleasedAmount } = useMemo(() => {
    const subtotal = itemsState.reduce((sum, item) => {
      return sum + (item.is_accepted ? item.price * item.packed_qty : 0);
    }, 0);

    const delivery = parseFloat(order.delivery_fee || 0);
    const packaging = parseFloat(order.packaging_fee || 0);
    const discount = parseFloat(order.discount_applied || 0) + parseFloat(order.promo_discount || 0) + parseFloat(order.wallet_discount || 0);

    const total = Math.max(0, subtotal + delivery + packaging - discount);
    const authAmt = parseFloat(order.authorized_amount || order.total_amount || 0);
    const released = Math.max(0, authAmt - total);

    return {
      packedSubtotal: subtotal,
      authorizedAmount: authAmt,
      finalTotal: total,
      autoReleasedAmount: released
    };
  }, [itemsState, order]);

  // Execute Dynamic Settlement via Backend
  const handleSettle = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const apiBase = import.meta.env.VITE_API_URL || '/api/v1';

      const payload = {
        items: itemsState.map(i => ({
          id: i.id,
          status: i.is_accepted ? 'ACCEPTED' : 'REJECTED',
          packed_quantity: i.packed_qty
        }))
      };

      const res = await axios.post(
        `${apiBase}/orders/${order.id}/settle_packing/`,
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setSettlementReceipt(res.data.settlement || res.data);
      toast.success(`Order #${order.id} settled! $${finalTotal.toFixed(2)} captured via PayPal.`);

      if (onSettled) {
        onSettled(res.data.order || res.data);
      }
    } catch (err) {
      console.error('Settlement error:', err);
      toast.error(err.response?.data?.detail || 'Settlement failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Packing Table Auto-Settlement
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                  #{order.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer: <strong className="text-slate-700 dark:text-slate-300">{order.customer_name || 'Shopper'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {settlementReceipt ? (
            /* Success State Receipt */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  PayPal Dynamic Capture Complete!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  The order was successfully packed and settled at the register.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">PayPal Pre-Authorization:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">${authorizedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Final Captured Amount:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">${finalTotal.toFixed(2)}</span>
                </div>
                {autoReleasedAmount > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60 text-emerald-600 dark:text-emerald-400">
                    <span className="font-semibold">Auto-Released to Buyer:</span>
                    <span className="font-bold">-${autoReleasedAmount.toFixed(2)} (Instant)</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-slate-400 font-mono text-[11px]">
                  <span>PayPal Capture ID:</span>
                  <span>{settlementReceipt.paypal_capture_id || 'CAP-SIMULATED-OK'}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md"
              >
                Done
              </button>
            </div>
          ) : (
            /* Items Verification List */
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>Verify items as you pack into the delivery bag:</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  {itemsState.filter(i => i.is_accepted).length}/{itemsState.length} Items Packed
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {itemsState.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      item.is_accepted 
                        ? 'bg-white dark:bg-slate-900' 
                        : 'bg-rose-50/40 dark:bg-rose-950/20 text-slate-400'
                    }`}
                  >
                    {/* Item Checkbox & Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleItem(index)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          item.is_accepted
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'border-2 border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                        }`}
                      >
                        {item.is_accepted && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>

                      <div className="truncate">
                        <div className={`text-xs font-semibold truncate ${item.is_accepted ? 'text-slate-900 dark:text-slate-100' : 'line-through text-slate-400'}`}>
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{item.unit}</span>
                          <span>•</span>
                          <span>${item.price.toFixed(2)}/ea</span>
                        </div>
                      </div>
                    </div>

                    {/* Stepper for Packed Quantity */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQty(index, -1)}
                          disabled={item.packed_qty <= 0}
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold font-mono">
                          {item.packed_qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(index, 1)}
                          disabled={item.packed_qty >= item.ordered_qty}
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="w-16 text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        ${(item.is_accepted ? item.price * item.packed_qty : 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer: Live Dynamic Capture Calculation */}
        {!settlementReceipt && (
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500">PayPal Authorized</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                  ${authorizedAmount.toFixed(2)}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">To Capture (Packed)</div>
                <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                  ${finalTotal.toFixed(2)}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-Released</div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  {autoReleasedAmount > 0 ? `-$${autoReleasedAmount.toFixed(2)}` : '$0.00'}
                </div>
              </div>
            </div>

            <button
              onClick={handleSettle}
              disabled={loading}
              className="w-full py-3 bg-linear-to-r from-amber-500 via-indigo-600 to-indigo-700 hover:from-amber-600 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Executing PayPal Dynamic Capture (final_capture=true)...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Capture ${finalTotal.toFixed(2)} & Auto-Release Difference via PayPal
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
