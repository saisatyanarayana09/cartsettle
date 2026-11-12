import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  CheckCircle2,
  Camera,
  FileText,
  ExternalLink,
  UploadCloud,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function PackingSettlementModal({
  order,
  isOpen,
  onClose,
  onSettled
}) {
  const [itemsState, setItemsState] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visionScanning, setVisionScanning] = useState(false);
  const [visionResult, setVisionResult] = useState(null);
  const [settlementReceipt, setSettlementReceipt] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (order?.items) {
      setItemsState(
        order.items.map(item => ({
          id: item.id,
          name: item.product_name_snapshot,
          unit: item.unit_snapshot,
          price: parseFloat(item.price_snapshot || 0),
          cost: parseFloat(item.item_cost_price || item.price_snapshot * 0.8),
          ordered_qty: item.quantity,
          packed_qty: item.packed_quantity || item.quantity,
          is_accepted: item.status !== 'REJECTED' && item.is_packed !== false,
          ai_verified: false,
          ai_notes: ''
        }))
      );
    }
  }, [order]);

  // Compute live totals
  const { packedSubtotal, authorizedAmount, finalTotal, autoReleasedAmount } = useMemo(() => {
    if (!order) {
      return { packedSubtotal: 0, authorizedAmount: 0, finalTotal: 0, autoReleasedAmount: 0 };
    }
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

  if (!isOpen || !order) return null;

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

  // AI Multimodal Vision Scan Handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setVisionScanning(true);
      

      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post(
        `/orders/${order.id}/vision_pack/`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      const vr = res.data.vision_result;
      setVisionResult(vr);
      toast.success(vr.summary || 'AI Vision scan complete!');

      // Automatically update itemsState based on AI detections
      if (vr.verified_items && Array.isArray(vr.verified_items)) {
        setItemsState(prev => prev.map(item => {
          const match = vr.verified_items.find(v => v.id === item.id || v.name?.toLowerCase().includes(item.name.toLowerCase()));
          if (match) {
            return {
              ...item,
              is_accepted: match.detected,
              packed_qty: match.detected ? (match.detected_quantity || item.ordered_qty) : 0,
              ai_verified: true,
              ai_notes: match.notes || (match.detected ? 'Verified by AI Camera' : 'Missing in bag')
            };
          }
          return item;
        }));
      }
    } catch (err) {
      console.error('Vision scan failed:', err);
      toast.error('AI scan error. Using standard manual checklist.');
    } finally {
      setVisionScanning(false);
    }
  };

  // Execute Dynamic Settlement via Backend
  const handleSettle = async () => {
    try {
      setLoading(true);
      const payload = {
        items: itemsState.map(i => ({
          id: i.id,
          status: i.is_accepted ? 'ACCEPTED' : 'REJECTED',
          packed_quantity: i.packed_qty
        }))
      };

      const res = await api.post(
        `/orders/${order.id}/settle_packing/`,
        payload
      );

      const data = res.data;
      setSettlementReceipt({
        ...data.settlement,
        invoice_receipt: data.invoice_receipt,
        order: data.order
      });

      toast.success(`Order #${order.id} settled! ₹${finalTotal.toFixed(2)} captured via PayPal.`);

      if (onSettled) {
        onSettled(data.order || data);
      }
    } catch (err) {
      console.error('Settlement error:', err);
      toast.error(err.response?.data?.detail || 'Settlement failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#56323E]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="owner-theme bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#2D1822] dark:text-[#FAF5EF]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E7DBCF] dark:border-white/[0.08] flex items-center justify-between bg-[#FAF5EF]/50 dark:bg-[#3F2231]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#2D1822] dark:text-[#FAF5EF]">
                  Packing Table Auto-Settlement
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#56323E]/10 text-[#56323E] dark:bg-[#EFDFD2]/10 dark:text-[#EFDFD2] font-bold">
                  #{order.id}
                </span>
              </div>
              <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA]">
                Customer: <strong className="text-[#5E4752] dark:text-[#C5B0BA]">{order.customer_name || 'Shopper'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#A68B98] hover:text-[#5E4752] dark:hover:text-[#FAF5EF] hover:bg-[#F2E9E0] dark:hover:bg-[#3F2231] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {settlementReceipt ? (
            /* Success State Receipt */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#2D1822] dark:text-[#FAF5EF]">
                  PayPal Dynamic Capture Complete!
                </h4>
                <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1">
                  Settled with dynamic partial capture (final_capture=true).
                </p>
              </div>

              <div className="bg-[#FAF5EF] dark:bg-[#3F2231]/60 rounded-2xl p-4 border border-[#E7DBCF] dark:border-white/[0.08] max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E7DBCF]/60 dark:border-white/[0.08]">
                  <span className="text-[#7D6671]">PayPal Pre-Authorization:</span>
                  <span className="font-bold text-[#2D1822] dark:text-[#FAF5EF]">₹{authorizedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E7DBCF]/60 dark:border-white/[0.08]">
                  <span className="text-[#7D6671]">Final Captured Amount:</span>
                  <span className="font-bold text-[#56323E] dark:text-[#EFDFD2]">₹{finalTotal.toFixed(2)}</span>
                </div>
                {autoReleasedAmount > 0 && (
                  <div className="flex justify-between py-1 border-b border-[#E7DBCF]/60 dark:border-white/[0.08] text-emerald-600 dark:text-emerald-400">
                    <span className="font-semibold">Auto-Released to Buyer:</span>
                    <span className="font-bold">-₹{autoReleasedAmount.toFixed(2)} (Instant Return)</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-[#A68B98] font-mono text-[11px]">
                  <span>PayPal Capture ID:</span>
                  <span>{settlementReceipt.paypal_capture_id || 'CAP-OK'}</span>
                </div>
              </div>

              {/* PayPal Invoicing v2 Quick Link */}
              {(settlementReceipt.invoice_receipt?.invoice_url || order.paypal_invoice_url) && (
                <div className="pt-2">
                  <a
                    href={settlementReceipt.invoice_receipt?.invoice_url || order.paypal_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Open Official PayPal Tax Invoice (Invoicing v2)
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-[#56323E] text-white rounded-xl text-xs font-bold hover:bg-[#432634] transition-all shadow-md cursor-pointer"
                >
                  Return to Orders
                </button>
              </div>
            </div>
          ) : (
            /* Items Verification List & AI Scanner */
            <>
              {/* AI Vision Scanner Header Strip */}
              <div className="p-3.5 rounded-2xl bg-[#FAF5EF]/70 dark:bg-[#432634] border border-[#E7DBCF] dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#56323E] text-white flex items-center justify-center shadow-xs">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2D1822] dark:text-[#EFDFD2]">
                      Gemini 3.5 Flash Multimodal Vision Scanner
                    </div>
                    <div className="text-[11px] text-[#56323E] dark:text-[#EFDFD2]">
                      Snap photo of packed bag for automated optical checklist
                    </div>
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={visionScanning}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#56323E] hover:bg-[#432634] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {visionScanning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analyzing Bag...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        📸 Scan Bag Photo
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Vision Scan Result Banner */}
              {visionResult && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>{visionResult.summary}</span>
                  </div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    {visionResult.fulfillment_percentage || 100}% Present
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-[#7D6671] dark:text-[#C5B0BA] px-1 pt-1">
                <span>Items checklist:</span>
                <span className="font-medium text-[#56323E] dark:text-[#EFDFD2]">
                  {itemsState.filter(i => i.is_accepted).length}/{itemsState.length} Items Packed
                </span>
              </div>

              {/* Auto Payment Return Notice if any items are missing / not yet packed */}
              {autoReleasedAmount > 0 && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <ArrowDownCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unpacked/missing items will be returned to customer via PayPal:</span>
                  </div>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    ₹{autoReleasedAmount.toFixed(2)} Returned
                  </span>
                </div>
              )}

              <div className="divide-y divide-[#E7DBCF] dark:divide-white/[0.08] border border-[#E7DBCF] dark:border-white/[0.08] rounded-2xl overflow-hidden">
                {itemsState.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      item.is_accepted 
                        ? 'bg-white dark:bg-[#351D28]' 
                        : 'bg-rose-50/40 dark:bg-rose-950/20 text-[#A68B98]'
                    }`}
                  >
                    {/* Item Checkbox & Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleItem(index)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          item.is_accepted
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'border-2 border-[#D9C6B8] dark:border-white/[0.08] hover:border-emerald-500'
                        }`}
                      >
                        {item.is_accepted && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>

                      <div className="truncate">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-xs font-semibold truncate ${item.is_accepted ? 'text-[#2D1822] dark:text-[#FAF5EF]' : 'line-through text-[#A68B98]'}`}>
                            {item.name}
                          </span>
                          {item.ai_verified && item.is_accepted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EFDFD2] text-[#56323E] dark:bg-[#432634] dark:text-[#EFDFD2]">
                              AI Checked
                            </span>
                          )}
                          {!item.is_accepted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              Missing (Auto-Refund)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#7D6671] flex items-center gap-2">
                          <span>{item.unit}</span>
                          <span>•</span>
                          <span>₹{item.price.toFixed(2)}/ea</span>
                          {item.ai_notes && (
                            <span className="text-[#8A6773] italic truncate max-w-xs">({item.ai_notes})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stepper for Packed Quantity */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-[#E7DBCF] dark:border-white/[0.08] rounded-xl bg-[#FAF5EF] dark:bg-[#3F2231]/60 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQty(index, -1)}
                          disabled={item.packed_qty <= 0}
                          className="w-6 h-6 flex items-center justify-center text-[#7D6671] hover:text-[#2D1822] dark:hover:text-[#FAF5EF] disabled:opacity-30 cursor-pointer"
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
                          className="w-6 h-6 flex items-center justify-center text-[#7D6671] hover:text-[#2D1822] dark:hover:text-[#FAF5EF] disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="w-16 text-right font-mono text-xs font-bold text-[#2D1822] dark:text-[#FAF5EF]">
                        ₹{(item.is_accepted ? item.price * item.packed_qty : 0).toFixed(2)}
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
          <div className="p-5 border-t border-[#E7DBCF] dark:border-white/[0.08] bg-[#FAF5EF]/80 dark:bg-[#351D28] space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#3F2231] border border-[#E7DBCF] dark:border-white/[0.08]">
                <div className="text-[11px] text-[#7D6671]">PayPal Authorized</div>
                <div className="text-sm font-bold text-[#2D1822] dark:text-[#FAF5EF] font-mono">
                  ₹{authorizedAmount.toFixed(2)}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF5EF] dark:bg-[#432634] border border-[#E7DBCF] dark:border-white/10">
                <div className="text-[11px] text-[#56323E] dark:text-[#EFDFD2] font-medium">To Capture (Packed)</div>
                <div className="text-sm font-bold text-[#56323E] dark:text-[#EFDFD2] font-mono">
                  ₹{finalTotal.toFixed(2)}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Auto-Released</div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  {autoReleasedAmount > 0 ? `-₹${autoReleasedAmount.toFixed(2)}` : '₹0.00'}
                </div>
              </div>
            </div>

            <button
              onClick={handleSettle}
              disabled={loading || visionScanning}
              className="w-full py-3 bg-linear-to-r from-amber-500 via-[#56323E] to-[#56323E] hover:from-amber-600 hover:to-[#56323E] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Executing PayPal Dynamic Capture & Invoicing v2...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Capture ₹{finalTotal.toFixed(2)} & Auto-Release Difference via PayPal
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
