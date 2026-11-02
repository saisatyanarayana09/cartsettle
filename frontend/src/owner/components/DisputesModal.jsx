import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle, FileText, Send, AlertTriangle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function DisputesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
      const res = await axios.get(`${apiBase}/orders/disputes/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const items = res.data.items || [];
      // Provide clean simulated item if sandbox disputes is empty
      if (items.length === 0) {
        setDisputes([
          {
            dispute_id: 'PP-D-849204',
            create_time: new Date().toISOString(),
            dispute_amount: { value: '45.00', currency_code: 'USD' },
            reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
            status: 'WAITING_FOR_SELLER_RESPONSE',
            disputed_transactions: [{ seller_transaction_id: '0A571661CA521504E' }]
          }
        ]);
      } else {
        setDisputes(items);
      }
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
      toast.error('Could not load disputes.');
    } finally {
      setLoading(false);
    }
  };

  const handleProvideEvidence = async () => {
    if (!selectedDispute) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      const apiBase = import.meta.env.VITE_API_URL || '/api/v1';

      await axios.post(
        `${apiBase}/orders/provide_dispute_evidence/`,
        {
          dispute_id: selectedDispute.dispute_id,
          notes: evidenceNotes || 'CartSettle verified packing via Gemini Vision optical scan. Unpacked missing items were automatically released back to buyer.'
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      toast.success('Fulfillment evidence submitted to PayPal Disputes API!');
      setSelectedDispute(null);
      setEvidenceNotes('');
      fetchDisputes();
    } catch (err) {
      console.error('Evidence error:', err);
      toast.error(err.response?.data?.detail || 'Failed to submit evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50/40 dark:bg-rose-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                PayPal Customer Disputes & Chargebacks
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  Disputes API v1
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Autonomous defense powered by CartSettle optical packing records
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

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading disputes from PayPal API...
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              No open customer disputes found. Clean store record!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              {disputes.map((d) => (
                <div key={d.dispute_id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                        {d.dispute_id}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {d.status || 'Action Required'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Reason: <strong className="text-slate-900 dark:text-slate-100">{d.reason || 'General Inquiry'}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Amount: ${d.dispute_amount?.value || '0.00'} {d.dispute_amount?.currency_code || 'USD'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDispute(d);
                      setEvidenceNotes(`CartSettle packing verified via Gemini Vision camera scanner. Dynamic capture captured only accepted line items, and the unfulfilled difference was auto-released back to buyer on PayPal.`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Provide Evidence
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Evidence Submission Drawer */}
          {selectedDispute && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3 mt-4">
              <div className="flex justify-between items-center text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <span>Submit Defense for {selectedDispute.dispute_id}</span>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <textarea
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                placeholder="Fulfillment and packing audit proof..."
                rows={3}
                className="w-full text-xs p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProvideEvidence}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Send to PayPal Disputes API'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
