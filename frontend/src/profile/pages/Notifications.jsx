import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Trash2, ChevronRight } from 'lucide-react';
import api, { getUserCacheSync, setUserCache } from '../../services/api';
import { useCart } from '../../cart-context';

export default function Notifications() {
  const cachedNotifs = getUserCacheSync('/notifications/');
  const [notifications, setNotifications] = useState(cachedNotifs || []);
  const [loading, setLoading] = useState(!cachedNotifs);
  const { refresh } = useCart();
  
  useEffect(() => {
    api.get('/notifications/')
      .then(res => {
        const list = res.data.results || res.data || [];
        setNotifications(list);
        setUserCache('/notifications/', list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}/`);
      const updated = notifications.filter(n => n.id !== id);
      setNotifications(updated);
      setUserCache('/notifications/', updated);
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Notifications</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Updates about your orders and offers.</p>
          </div>
        </div>
      </div>
      
      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-50 dark:bg-slate-800/60 animate-pulse rounded-xl border border-gray-100 dark:border-slate-800"></div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center p-12 text-center h-[50vh]">
          <div className="w-20 h-20 bg-primary-50 dark:bg-primary-950/50 rounded-full flex items-center justify-center text-primary-400 dark:text-primary-300 mb-5">
            <Bell size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You're all caught up!</h3>
          <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto">We'll notify you here when there are updates about your orders or exciting new offers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n.id} className={`rounded-xl p-4 shadow-sm border ${n.is_read ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800' : 'border-primary-200 dark:border-primary-800/80 bg-primary-50 dark:bg-primary-950/40'}`}>
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-bold ${n.is_read ? 'text-gray-900 dark:text-white' : 'text-primary-900 dark:text-primary-300'}`}>{n.title}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                  <button onClick={() => deleteNotification(n.id)} className="text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition"><Trash2 size={16}/></button>
                </div>
              </div>
              <p className={`text-sm ${n.is_read ? 'text-gray-600 dark:text-slate-300' : 'text-primary-800 dark:text-primary-200'}`}>{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
