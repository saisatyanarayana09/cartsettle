import { useState, useEffect } from 'react';
import api, { getUserCacheSync, setUserCache } from '../../services/api';

export default function Wallet() {
  const cachedWallet = getUserCacheSync('/auth/wallet/');
  const [wallet, setWallet] = useState(cachedWallet);
  const [loading, setLoading] = useState(!cachedWallet);

  useEffect(() => {
    api.get('/auth/wallet/')
      .then(res => {
        setWallet(res.data);
        setUserCache('/auth/wallet/', res.data);
      })
      .catch(err => {
        console.error("Failed to load wallet", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
        <div className="h-64 bg-gray-200 rounded-2xl w-full"></div>
      </div>
    );
  }

  if (!wallet) return null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-emerald-50 font-medium mb-1">Your Wallet Balance</h2>
        <div className="text-4xl font-bold mb-4">
          ₹{parseFloat(wallet.balance).toFixed(2)}
        </div>
        <p className="text-sm text-emerald-100">
          Use this balance at checkout to get instant discounts on your groceries.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/70">
          <h3 className="font-semibold text-gray-800 dark:text-white">Transaction History</h3>
        </div>
        
        {wallet.transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400">
            No transactions yet. Earn money by referring friends!
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {wallet.transactions.map(tx => (
              <li key={tx.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">
                    {tx.transaction_type.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">{tx.description}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className={`font-bold ${parseFloat(tx.amount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                  {parseFloat(tx.amount) > 0 ? '+' : ''}₹{parseFloat(tx.amount).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
