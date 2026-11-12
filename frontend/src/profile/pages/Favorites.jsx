import { Link } from '../../router';
import { Heart, Package, ChevronRight, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../cart-context';

export default function Favorites() {
  const { favorites, toggleFavorite, add } = useCart();

  const handleAddToCart = async (productDetails) => {
    if (!productDetails?.id) return;
    try {
      await add(productDetails);
      toast.success(`${productDetails.name || 'Item'} added to cart`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add to cart');
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
          {favorites.map(fav => {
            const prod = fav.product_details || {};
            const targetProductId = prod.id || fav.product?.id || fav.product;
            const displayPrice = prod.offer_price || prod.regular_price;
            return (
              <div key={fav.id || targetProductId} className="group flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-md transition-all">
                <div className="w-20 h-20 shrink-0 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                  {prod.image ? (
                    <img loading="lazy" decoding="async" src={prod.image} alt={prod.name || 'Product'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                  ) : (
                    <Package className="text-slate-300 dark:text-slate-600" size={24}/>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <Link to={`/product/${targetProductId}`} className="font-extrabold text-slate-900 dark:text-white truncate block hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-base mb-0.5">{prod.name || 'Saved Product'}</Link>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{prod.unit}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-slate-900 dark:text-white">₹{displayPrice}</p>
                    {prod.id && (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(prod)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                      >
                        <ShoppingBag size={12} /> Add
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFavorite(targetProductId)}
                  className="shrink-0 p-2.5 text-rose-500 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors self-start cursor-pointer"
                  title="Remove from favorites"
                >
                  <Heart fill="currentColor" size={18}/>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
