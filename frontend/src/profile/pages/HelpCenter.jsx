import { Link } from 'react-router-dom';
import { HelpCircle, ChevronRight } from 'lucide-react';
import { useCart } from '../../cart-context';

export default function HelpCenter() {
  const { storeSettings } = useCart();
  
  return (
    <div>
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Help Center</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Need assistance? We're here to help.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-8 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-32 shrink-0 bg-primary-50 dark:bg-primary-950/50 text-primary-300 dark:text-primary-400 rounded-full flex items-center justify-center">
          <HelpCircle size={64} />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Contact Support</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto md:mx-0 text-sm">Reach out to our store directly using the contact details below. We typically respond within 24 hours.</p>
          
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-5 inline-block text-left w-full max-w-md shadow-sm">
            <h4 className="font-black text-slate-900 dark:text-white mb-1">{storeSettings?.store_name || "Narendra Kirana"}</h4>
            {storeSettings?.store_address && <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 font-medium whitespace-pre-wrap">{storeSettings.store_address}</p>}
            
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-2">
              {storeSettings?.store_phone && (
                <a href={`tel:${storeSettings.store_phone}`} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">📞</div>
                  {storeSettings.store_phone}
                </a>
              )}
              {storeSettings?.store_email && (
                <a href={`mailto:${storeSettings.store_email}`} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">✉️</div>
                  {storeSettings.store_email}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
