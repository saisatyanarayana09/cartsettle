import { useState, useEffect } from 'react';
import api, { getUserCacheSync, setUserCache } from '../../services/api';
import { useCart } from '../../cart-context';
import { Users, Clock, XCircle, Wallet, Gift, Copy, Check, Share2, ArrowRight, Star, Target, Sparkles, ChevronRight, Award } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export default function ReferAndEarn() {
  const { user } = useCart();
  const cachedSettings = getUserCacheSync('/offers/referral-settings/');
  const cachedHistory = getUserCacheSync('/offers/referrals/');
  const cachedWallet = getUserCacheSync('/auth/wallet/');
  const cachedMilestones = getUserCacheSync('/offers/referral-milestones/');
  const hasCache = Boolean(cachedSettings);

  const [settings, setSettings] = useState(cachedSettings);
  const [history, setHistory] = useState(cachedHistory || []);
  const [wallet, setWallet] = useState(cachedWallet);
  const [milestones, setMilestones] = useState(cachedMilestones || []);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!hasCache);
  const [activeTab, setActiveTab] = useState('network');
  const [qrModal, setQrModal] = useState({ isOpen: false, referralId: null, base64: null, qrData: null });

  useEffect(() => {
    Promise.all([
      api.get('/offers/referral-settings/'),
      api.get('/offers/referrals/'),
      api.get('/auth/wallet/'),
      api.get('/offers/referral-milestones/')
    ]).then(([settingsRes, historyRes, walletRes, milestonesRes]) => {
      const sData = settingsRes.data;
      const hData = historyRes.data.results || historyRes.data || [];
      const wData = walletRes.data;
      const mData = milestonesRes.data.results || milestonesRes.data || [];
      setSettings(sData);
      setHistory(hData);
      setWallet(wData);
      setMilestones(mData);
      setUserCache('/offers/referral-settings/', sData);
      setUserCache('/offers/referrals/', hData);
      setUserCache('/auth/wallet/', wData);
      setUserCache('/offers/referral-milestones/', mData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const referralCode = user?.customer_profile?.referral_code || '';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!settings || !referralCode) return;
    
    const referralUrl = `${window.location.origin}/download?ref=${encodeURIComponent(referralCode)}`;
    let text = settings.share_text_template || 'Join Narendra Kirana with my referral code {code}! {link}';
    if (text.includes('{link}')) {
      text = text.replace(/{code}/g, referralCode).replace(/{link}/g, referralUrl);
    } else {
      text = `${text.replace(/{code}/g, referralCode).trim()}\n${referralUrl}`;
    }
      
    if (navigator.share) {
      navigator.share({
        title: 'Join me on Narendra Kirana',
        text: text,
      }).catch(console.error);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleShowQR = async (referralId) => {
    try {
      const res = await api.get(`/offers/referrals/${referralId}/qr_code/`);
      setQrModal({
        isOpen: true,
        referralId,
        base64: res.data?.qr_code_base64 || null,
        qrData: res.data?.qr_data || (res.data?.token ? `secure_qr:${res.data.token}` : null),
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load QR Code');
      console.error(err);
    }
  };

  // Automatically poll for status change while QR is open!
  useEffect(() => {
    let intervalId;
    if (qrModal.isOpen && qrModal.referralId) {
      intervalId = setInterval(async () => {
        try {
          // Fetch the latest history to see if status changed
          const res = await api.get('/offers/referrals/');
          const latestHistory = Array.isArray(res.data) ? res.data : (res.data?.results || []);
          const currentRef = latestHistory.find(h => h.id === qrModal.referralId);
          
          if (currentRef && currentRef.status === 'COMPLETED') {
            // It was approved!
            setHistory(latestHistory);
            setQrModal({ isOpen: false, referralId: null, base64: null });
            toast.success('Reward Approved by Store Owner!', { icon: '🎉', duration: 5000 });
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000); // Check every 3 seconds
    }
    return () => clearInterval(intervalId);
  }, [qrModal.isOpen, qrModal.referralId]);

  const handleClaim = async (referralId) => {
    try {
      await api.post(`/offers/referrals/${referralId}/claim/`);
      toast.success('Reward claimed! Show the QR code at the store.');
      setHistory(history.map(h => h.id === referralId ? { ...h, status: 'AWAITING_APPROVAL' } : h));
      handleShowQR(referralId);
    } catch (err) {
      toast.error('Failed to claim reward.');
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>
  );

  if (!settings || !settings.is_active) {
    return (
      <div className="bg-white p-16 rounded-3xl shadow-sm text-center border border-gray-100 max-w-2xl mx-auto mt-10">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Gift className="w-12 h-12 text-gray-300" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Refer & Earn is Unavailable</h2>
        <p className="text-gray-500 text-lg leading-relaxed">We are currently revamping our referral program to bring you even better rewards. Check back soon!</p>
      </div>
    );
  }

  const completedReferrals = history.filter(h => h.status === 'COMPLETED').length;
  const pendingReferrals = history.filter(h => h.status === 'PENDING').length;
  const readyToClaim = history.filter(h => h.status === 'READY_TO_CLAIM').length;
  const awaitingApproval = history.filter(h => h.status === 'AWAITING_APPROVAL').length;
  
  const referralCashTransactions = wallet?.transactions
    ?.filter(t => t.transaction_type === 'REFERRAL_REWARD') || [];
    
  const totalCashEarned = wallet?.transactions
    ?.filter(t => t.transaction_type === 'REFERRAL_REWARD' || t.transaction_type === 'MILESTONE_BONUS')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  const productsEarned = Math.max(0, completedReferrals - referralCashTransactions.length);

  const isProductReward = !!settings?.referrer_reward_product;
  const rewardText = isProductReward 
    ? `a Free ${settings?.referrer_reward_product_name || 'Gift'}`
    : `₹${parseFloat(settings?.referrer_reward || 0)}`;

  // Milestone gamification calculations
  const nextMilestone = milestones.find(m => m.required_referrals > completedReferrals);
  let progressPercentage = 0;
  if (nextMilestone) {
    const previousMilestone = [...milestones].reverse().find(m => m.required_referrals <= completedReferrals);
    const start = previousMilestone ? previousMilestone.required_referrals : 0;
    const end = nextMilestone.required_referrals;
    progressPercentage = ((completedReferrals - start) / (end - start)) * 100;
  } else if (milestones.length > 0) {
    progressPercentage = 100;
  }

  return (
    <div className="w-full mx-auto space-y-10 py-6">
      
      {/* High-End Hero / Invite Card */}
      <div className="relative bg-[#0f172a] rounded-[2rem] p-8 sm:p-12 overflow-hidden shadow-2xl">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-sm font-bold tracking-wide backdrop-blur-md">
              <Sparkles size={16} /> Premium Referral Program
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              Share the love.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                Earn {rewardText}.
              </span>
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
              Invite your network to shop with us. Once they complete their first order, you instantly unlock your reward.
            </p>
          </div>

          <div className="relative group">
            {/* The "Credit Card" style invite box */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-xl transform transition-transform duration-500">
              <div className="flex justify-between items-center mb-8">
                <div className="text-slate-400 text-sm font-bold uppercase tracking-widest">Your Unique Code</div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <Target size={20} className="text-emerald-400" />
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-black/30 p-4 rounded-2xl mb-6 border border-white/10 group-hover:border-emerald-500/50 transition-colors">
                <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-white">{referralCode}</span>
                <button 
                  onClick={handleCopy}
                  className={`p-3 rounded-xl transition-all duration-300 ${copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {copied ? <Check size={22} strokeWidth={3} /> : <Copy size={22} />}
                </button>
              </div>

              <button 
                onClick={handleShare}
                className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold text-lg hover:bg-[#1ebd5a] transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:shadow-[0_0_25px_rgba(37,211,102,0.5)]"
              >
                <Share2 size={20} /> Share via WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Gamification Progress Bar (Only show if milestones exist) */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <Award className="text-emerald-500" /> Milestone Rewards
              </h3>
              <p className="text-gray-500 mt-1">Unlock massive cash bonuses by inviting more friends.</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-indigo-600">{completedReferrals}</div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Friends Joined</div>
            </div>
          </div>

          <div className="relative pt-8 pb-4">
            {/* The Track */}
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
              ></div>
            </div>

            {/* Checkpoints */}
            <div className="absolute top-0 left-0 w-full flex justify-between px-2 transform -translate-y-2">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-4 ${completedReferrals >= 0 ? 'bg-emerald-500 border-white shadow-md text-white' : 'bg-gray-200 border-white text-gray-400'} flex items-center justify-center text-xs font-bold z-10`}>
                  0
                </div>
              </div>
              
              {milestones.map((m, index) => {
                const isAchieved = completedReferrals >= m.required_referrals;
                const isNext = nextMilestone && m.id === nextMilestone.id;
                
                return (
                  <div key={m.id} className="flex flex-col items-center relative group">
                    <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center text-sm font-bold z-10 transition-all duration-300 ${
                      isAchieved 
                        ? 'bg-emerald-500 border-white text-white shadow-lg scale-110' 
                        : isNext 
                          ? 'bg-white border-indigo-500 text-indigo-600 shadow-lg scale-110 animate-pulse' 
                          : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      {m.required_referrals}
                    </div>
                    <div className={`absolute top-12 whitespace-nowrap text-center ${isAchieved ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      <div className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl">
                        Bonus: ₹{m.bonus_reward}
                      </div>
                      <div className="w-3 h-3 bg-gray-900 transform rotate-45 mx-auto -mt-1.5"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* How it Works (Modern Stepper) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center group hover:border-emerald-200 transition-colors">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform rotate-3 group-hover:rotate-6">
            <Share2 size={28} strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">1. Share Your Link</h3>
          <p className="text-gray-500 leading-relaxed text-sm">Send your unique code or link to friends, family, or your social network.</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center group hover:border-blue-200 transition-colors">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform -rotate-3 group-hover:-rotate-6">
            <Users size={28} strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">2. They Make a Purchase</h3>
          <p className="text-gray-500 leading-relaxed text-sm">Your friends sign up and successfully receive their very first order.</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center group hover:border-indigo-200 transition-colors">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform rotate-3 group-hover:rotate-6">
            <Gift size={28} strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">3. Claim Your Reward</h3>
          <p className="text-gray-500 leading-relaxed text-sm">You unlock your reward immediately in your dashboard to claim.</p>
        </div>
      </div>

      {/* Analytics & Ledger Section */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        {/* Header & Tabs */}
        <div className="p-2 bg-gray-50/50 border-b border-gray-100">
          <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-2xl w-full sm:w-fit mx-auto sm:mx-4 my-2">
            <button 
              onClick={() => setActiveTab('network')}
              className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'network' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Network Tracking
            </button>
            <button 
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === 'rewards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Reward Ledger
            </button>
          </div>
        </div>

        {activeTab === 'network' && (
          <div className="p-0">
            {/* Quick Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-100 divide-x divide-y md:divide-y-0 divide-gray-100">
              <div className="p-6 text-center">
                <div className="text-3xl font-black text-gray-900">{history.length}</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Total Invites</div>
              </div>
              <div className="p-6 text-center">
                <div className="text-3xl font-black text-emerald-600">{completedReferrals}</div>
                <div className="text-xs font-bold text-emerald-600/80 uppercase tracking-widest mt-1">Completed</div>
              </div>
              <div className="p-6 text-center">
                <div className="text-3xl font-black text-indigo-600">{readyToClaim + awaitingApproval}</div>
                <div className="text-xs font-bold text-indigo-600/80 uppercase tracking-widest mt-1">To Claim</div>
              </div>
              <div className="p-6 text-center">
                <div className="text-3xl font-black text-amber-600">{pendingReferrals}</div>
                <div className="text-xs font-bold text-amber-600/80 uppercase tracking-widest mt-1">Pending</div>
              </div>
            </div>

            {/* List */}
            {history.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <Users className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Your network is empty</h3>
                <p className="text-gray-500 max-w-md">Share your code above. Once friends sign up, their progress will be tracked right here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {history.map(ref => (
                  <li key={ref.id} className="p-6 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-black text-lg shadow-inner border border-indigo-100/50">
                        {(ref.referred_name || 'F')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-gray-900 text-lg">
                          {ref.referred_name || 'Friend'}
                        </div>
                        <div className="text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <Clock size={14} className="text-gray-400" />
                          Joined {new Date(ref.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-auto flex justify-end">
                      {ref.status === 'COMPLETED' && (
                        <div className="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 flex items-center gap-2 border border-emerald-100">
                          <Check size={16} strokeWidth={3} />
                          Rewarded
                        </div>
                      )}
                      {ref.status === 'READY_TO_CLAIM' && (
                        <button onClick={() => handleClaim(ref.id)} className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5">
                          <Sparkles size={16} />
                          Claim Reward
                        </button>
                      )}
                      {ref.status === 'AWAITING_APPROVAL' && (
                        <button onClick={() => handleShowQR(ref.id)} className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md">
                          <Sparkles size={16} />
                          Show Claim QR
                        </button>
                      )}
                      {ref.status === 'PENDING' && (
                        <div className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-50 text-amber-700 flex items-center gap-2 border border-amber-100">
                          <Clock size={16} strokeWidth={3} />
                          Pending First Order
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="p-0">
            {/* Quick Stats Strip */}
            <div className="grid grid-cols-2 border-b border-gray-100 divide-x divide-gray-100">
              <div className="p-6 text-center bg-emerald-50/30">
                <div className="text-4xl font-black text-emerald-600">₹{totalCashEarned}</div>
                <div className="text-xs font-bold text-emerald-600/80 uppercase tracking-widest mt-1">Total Cash Earned</div>
              </div>
              <div className="p-6 text-center bg-indigo-50/30">
                <div className="text-4xl font-black text-indigo-600">{productsEarned}</div>
                <div className="text-xs font-bold text-indigo-600/80 uppercase tracking-widest mt-1">Free Products Earned</div>
              </div>
            </div>

            {referralCashTransactions.length === 0 && completedReferrals === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <Wallet className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No rewards yet</h3>
                <p className="text-gray-500 max-w-md">Your ledger will populate as soon as your referrals complete their orders and you claim your rewards.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {referralCashTransactions.map(t => (
                  <li key={t.id} className="p-6 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                        <Wallet size={20} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="font-extrabold text-gray-900 text-lg">
                          Cash Deposit
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                          {t.description || 'Referral Reward'}
                        </div>
                        <div className="text-xs text-gray-400 font-medium mt-1">
                          {new Date(t.created_at).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-600">
                      +₹{parseFloat(t.amount)}
                    </div>
                  </li>
                ))}
                
                {history.filter(h => h.status === 'COMPLETED').slice(0, productsEarned).map((h, i) => (
                  <li key={`product-${h.id || i}`} className="p-6 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <Gift size={20} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="font-extrabold text-gray-900 text-lg">
                          Free {settings?.referrer_reward_product_name || 'Product'}
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                          Approved for referring {h.referred_name || 'a friend'}
                        </div>
                        <div className="text-xs text-gray-400 font-medium mt-1">
                          {h.completed_at ? new Date(h.completed_at).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </div>
                      </div>
                    </div>
                    <div className="text-lg font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">
                      1 Item
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {qrModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 transition-all duration-300"
          onClick={() => setQrModal({ isOpen: false, referralId: null, base64: null })}
        >
          <div 
            className="bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 text-center relative overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            {/* Apple Wallet Style Abstract Glows */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <button 
              onClick={() => setQrModal({ isOpen: false, referralId: null, base64: null })} 
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
            >
              <XCircle size={24} />
            </button>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                <Sparkles size={28} />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-wide">Claim Reward</h2>
              <p className="text-slate-400 text-sm mb-8">Show this QR Pass to the cashier to instantly redeem your reward.</p>
              
              {/* Glowing QR Container */}
              <div className="relative group mb-8">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-indigo-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                <div className="relative bg-white p-5 rounded-3xl border border-white/20 shadow-xl keep-white" data-keep-white="true">
                  {qrModal.base64 ? (
                    <img src={`data:image/png;base64,${qrModal.base64}`} alt="QR Code" className="w-48 h-48 mx-auto object-contain" />
                  ) : qrModal.qrData ? (
                    <div className="flex items-center justify-center p-2 bg-white rounded-2xl">
                      <QRCodeSVG
                        value={qrModal.qrData}
                        size={192}
                        level="M"
                        includeMargin={false}
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400">
                      Loading QR...
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full text-left flex items-start gap-3">
                <div className="text-amber-400 mt-0.5">
                  <Star size={18} fill="currentColor" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Pro Tip</p>
                  <p className="text-xs text-slate-400 mt-0.5">Turn up your screen brightness for a faster scan.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
