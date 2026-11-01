import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Settings, Users, Award, QrCode, Edit, Trash2, Check, XCircle } from 'lucide-react';

import QRScanner from '../components/QRScanner';
import { createPortal } from 'react-dom';

export default function Referrals() {
  const [activeTab, setActiveTab] = useState('settings');
  const [rewardType, setRewardType] = useState('money');
  const [settings, setSettings] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedReferralId, setScannedReferralId] = useState(null);
  const [scannedToken, setScannedToken] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [setRes, milRes, histRes, prodRes] = await Promise.all([
        api.get('/offers/referral-settings/'),
        api.get('/offers/referral-milestones/'),
        api.get('/offers/referrals/'),
        api.get('/products/?limit=100')
      ]);
      setSettings(setRes.data);
      if (setRes.data.referrer_reward_product) {
        setRewardType('product');
      } else {
        setRewardType('money');
      }
      setMilestones(milRes.data.results || milRes.data);
      setHistory(histRes.data.results || histRes.data);
      setProducts(prodRes.data.results || prodRes.data);
    } catch (err) {
      toast.error('Failed to load referral data');
      setSettings({ is_active: false }); // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...settings, referee_reward: 0 };
      await api.patch('/offers/referral-settings/', payload);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    const req = e.target.required_referrals.value;
    const rew = e.target.bonus_reward.value;
    try {
      await api.post('/offers/referral-milestones/', { required_referrals: req, bonus_reward: rew });
      toast.success('Milestone added');
      e.target.reset();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.required_referrals?.[0] || 'Failed to add milestone');
    }
  };

  const handleDeleteMilestone = async (id) => {
    try {
      await api.delete(`/offers/referral-milestones/${id}/`);
      toast.success('Milestone deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete milestone');
    }
  };

  const handleApprove = async (referralId, directToken = null) => {
    try {
      const token = directToken !== null
        ? directToken
        : (scannedReferralId && scannedReferralId.toString() === referralId?.toString() ? (scannedToken || '') : '');
      await api.post(`/offers/referrals/${referralId}/approve/`, { token });
      toast.success('Reward approved successfully');
      setScannedReferralId(null);
      setScannedToken(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve reward');
    }
  };

  const handleScan = async (decodedText) => {
    if (decodedText && decodedText.startsWith("secure_qr:")) {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([200]);
      }
      const token = decodedText.substring(10);
      const id = token.split(":")[0];
      
      // We must fetch the latest data from the server so we have the referral
      // in our local state, otherwise the modal won't find it and won't render!
      await fetchData(); 
      
      setScannedReferralId(id);
      setScannedToken(token);
      setShowScanner(false);
    } else if (decodedText && decodedText.startsWith("approve_referral:")) {
      toast.error("This old QR code is no longer secure. Please ask the customer to refresh their page.");
      setShowScanner(false);
    } else {
      toast.error("Invalid QR Code format.");
      setShowScanner(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const scannedReferral = history.find(h => h.id.toString() === scannedReferralId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {scannedReferralId && scannedReferral && scannedReferral.status === 'AWAITING_APPROVAL' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Award size={32} />
            </div>
            <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Approve Reward</h2>
            <p className="text-slate-500 text-center text-sm mb-8">
              Please verify the referral details below before finalizing the approval.
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="text-slate-500 text-sm font-medium">Customer (Referrer)</span>
                <span className="text-slate-900 font-bold">{scannedReferral.referrer_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="text-slate-500 text-sm font-medium">Referred Friend</span>
                <span className="text-slate-900 font-bold">{scannedReferral.referred_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="text-slate-500 text-sm font-medium">Date Referred</span>
                <span className="text-slate-900 font-bold">
                  {new Date(scannedReferral.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm font-medium">Reward Value</span>
                <span className="text-emerald-600 font-black text-lg">
                  {settings?.referrer_reward_product 
                    ? `1x ${settings.referrer_reward_product_name}` 
                    : `₹${parseFloat(settings?.referrer_reward || 0)} Cash`}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setScannedReferralId(null)}
                className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleApprove(scannedReferralId)}
                className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.23)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Check size={18} strokeWidth={3} /> Approve
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {scannedReferralId && scannedReferral && scannedReferral.status !== 'AWAITING_APPROVAL' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center relative overflow-hidden border-t-8 border-red-500">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <XCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Already Claimed!</h2>
            <p className="text-slate-500 text-sm mb-6">
              This QR code is invalid because the reward has already been claimed and processed by the system.
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-100 text-left">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Claim Details</div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600 text-sm">Customer:</span>
                <span className="text-slate-900 font-bold text-sm">{scannedReferral.referrer_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Claimed On:</span>
                <span className="text-slate-900 font-bold text-sm">
                  {scannedReferral.completed_at ? new Date(scannedReferral.completed_at).toLocaleString() : 'Unknown'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setScannedReferralId(null)}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      , document.body)}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Referral Program</h1>
        <button 
          onClick={() => setShowScanner(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 transition-colors"
        >
          <QrCode size={18} />
          Scan Customer QR
        </button>
      </div>

      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Settings size={18} /> Configuration
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'milestones' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Award size={18} /> Bonus Milestones
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Users size={18} /> History & Monitor
        </button>
      </div>

      {activeTab === 'settings' && (
        <form onSubmit={handleSettingsSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Program Status</h2>
              <p className="text-sm text-gray-500">Enable or disable the referral program entirely.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.is_active} onChange={e => setSettings({...settings, is_active: e.target.checked})} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-md font-semibold mb-3">Referrer Reward Type</h3>
            <div className="flex space-x-6 mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" checked={rewardType === 'money'} onChange={() => {
                  setRewardType('money');
                  setSettings({...settings, referrer_reward_product: null});
                }} className="text-indigo-600 focus:ring-indigo-500" />
                <span className="font-medium text-gray-700">Cash Wallet Reward</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" checked={rewardType === 'product'} onChange={() => {
                  setRewardType('product');
                  setSettings({...settings, referrer_reward: 0});
                }} className="text-indigo-600 focus:ring-indigo-500" />
                <span className="font-medium text-gray-700">Free Product Reward</span>
              </label>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              {rewardType === 'money' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referrer Reward (₹)</label>
                  <input type="number" step="0.01" value={settings.referrer_reward} onChange={e => setSettings({...settings, referrer_reward: e.target.value})} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white" />
                  <p className="text-xs text-gray-500 mt-1">Amount added to wallet when their friend completes first order.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Free Product</label>
                  <select value={settings.referrer_reward_product || ''} onChange={e => setSettings({...settings, referrer_reward_product: e.target.value || null})} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border bg-white">
                    <option value="">-- Select a product --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">A free order containing this product will be automatically created for the referrer.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-md font-semibold">Minimum Spend Requirement</h3>
                <p className="text-sm text-gray-500">Require the referrer to spend a certain amount before they can earn referral rewards.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.require_min_spend} onChange={e => setSettings({...settings, require_min_spend: e.target.checked})} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            {settings.require_min_spend && (
              <div className="grid grid-cols-2 gap-6 bg-indigo-50 p-4 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-indigo-900 mb-1">Minimum Spend Amount (₹)</label>
                  <input type="number" step="0.01" value={settings.min_spend_amount} onChange={e => setSettings({...settings, min_spend_amount: e.target.value})} className="w-full rounded-lg border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-900 mb-1">Time Period</label>
                  <select value={settings.min_spend_period} onChange={e => setSettings({...settings, min_spend_period: e.target.value})} className="w-full rounded-lg border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border">
                    <option value="WEEK">Past 7 Days</option>
                    <option value="MONTH">Past 30 Days</option>
                    <option value="YEAR">Past 365 Days</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Share Message Template</label>
            <textarea value={settings.share_text_template} onChange={e => setSettings({...settings, share_text_template: e.target.value})} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border h-24 resize-none" />
            <p className="text-xs text-gray-500 mt-1">Use {'{code}'} and {'{link}'} as placeholders.</p>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Save Configuration
            </button>
          </div>
        </form>
      )}

      {activeTab === 'milestones' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <form onSubmit={handleAddMilestone} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-semibold mb-4">Add New Milestone</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Referrals</label>
                <input type="number" name="required_referrals" required min="1" className="w-full rounded-lg border-gray-300 shadow-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Reward (₹)</label>
                <input type="number" name="bonus_reward" step="0.01" required min="1" className="w-full rounded-lg border-gray-300 shadow-sm p-2 border" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Add Milestone
              </button>
            </form>
          </div>
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
<table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrals Needed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonus Reward</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {milestones.length === 0 ? (
                    <tr><td colSpan="3" className="px-6 py-4 text-center text-gray-500">No milestones configured</td></tr>
                  ) : milestones.map(m => (
                    <tr key={m.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{m.required_referrals} friends</td>
                      <td className="px-6 py-4 whitespace-nowrap text-emerald-600 font-bold">₹{m.bonus_reward}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => handleDeleteMilestone(m.id)} className="text-red-600 hover:text-red-900 font-medium text-sm">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users size={24} />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{history.length}</div>
                <div className="text-sm text-gray-500 font-medium">Total Initiated</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Award size={24} />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{history.filter(h => h.status === 'COMPLETED').length}</div>
                <div className="text-sm text-gray-500 font-medium">Rewarded</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Award size={24} />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{history.filter(h => h.status === 'AWAITING_APPROVAL').length}</div>
                <div className="text-sm text-gray-500 font-medium">Needs Approval</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Settings size={24} />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{history.filter(h => h.status === 'PENDING').length}</div>
                <div className="text-sm text-gray-500 font-medium">Pending</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">Referral Ledger</h3>
            </div>
            <div className="overflow-x-auto">
<table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Initiated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referred User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No referrals have been made yet across the platform.</td></tr>
                ) : history.map(ref => (
                  <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {new Date(ref.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{ref.referrer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{ref.referred_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ref.status === 'COMPLETED' && <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">Completed</span>}
                      {ref.status === 'AWAITING_APPROVAL' && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Needs Approval</span>}
                      {ref.status === 'READY_TO_CLAIM' && <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">Ready to Claim</span>}
                      {ref.status === 'PENDING' && <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Pending</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ref.status === 'AWAITING_APPROVAL' && (
                        <button onClick={() => handleApprove(ref.id)} className="text-indigo-600 hover:text-indigo-900 font-bold text-sm">Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
</div>
          </div>
        </div>
      )}
    </div>
  );
}
