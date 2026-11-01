import { Link } from 'react-router-dom';
import { Heart, Package, ChevronRight } from 'lucide-react';
import { useCart } from '../../cart-context';

export default function Favorites() {
  const { favorites, toggleFavorite } = useCart();

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Favorites</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Products you've saved for later.</p>
          </div>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-rose-50 dark:bg-rose-950/50 rounded-full flex items-center justify-center text-rose-400 dark:text-rose-300 mb-6 shadow-inner">
            <Heart size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No favorites yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">Keep track of the products you love by clicking the heart icon on any product.</p>
          <Link to="/products" className="bg-primary-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-primary-700 hover:shadow-md active:scale-95 transition-all inline-flex items-center gap-2">
            Browse Products <ChevronRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {favorites.map(fav => (
            <div key={fav.id} className="group flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-md transition-all">
              <div className="w-20 h-20 shrink-0 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                {fav.product_details?.image ? (
                  <img loading="lazy" decoding="async" src={fav.product_details.image} alt="Product" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                ) : (
                  <Package className="text-slate-300 dark:text-slate-600" size={24}/>
                )}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <Link to={`/product/${fav.product_details?.id}`} className="font-extrabold text-slate-900 dark:text-white truncate block hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-base mb-0.5">{fav.product_details?.name}</Link>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{fav.product_details?.unit}</p>
                <div className="flex items-center justify-between">
                  <p className="font-black text-slate-900 dark:text-white">₹{fav.product_details?.regular_price}</p>
                </div>
              </div>
              <button onClick={() => toggleFavorite(fav.product_details?.id)} className="shrink-0 p-2.5 text-rose-500 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors self-start" title="Remove from favorites">
                <Heart fill="currentColor" size={18}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
