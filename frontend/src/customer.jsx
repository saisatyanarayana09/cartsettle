import { optimizeImage } from './utils/image';

import React, { useEffect, useState, useMemo, useCallback } from 'react'

import { GSAPFadeUp, GSAPZoomIn, GSAPSlideIn, GSAPStagger } from './components/GSAPScroll'

import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { ChevronRight, ChevronLeft, Search, X, Heart, ArrowLeft, ShoppingCart, Sparkles, Zap, Star, Megaphone, ShieldCheck, Tag, Minus, Plus, Check, Share2, Loader2, PackageSearch } from 'lucide-react'

import api, { readCacheSync } from './services/api'

import { CustomerLayout } from './customer-layout'

import { useCart } from './cart-context'

import toast from 'react-hot-toast'



const unpack = (response) => response.data.results ?? response.data



// Vibrant color palette for category cards

const CATEGORY_COLORS = [

  'from-emerald-700 to-emerald-800',

  'from-emerald-800 to-emerald-900',

  'from-emerald-600 to-emerald-700',

  'from-cyan-500 to-blue-500',

  'from-fuchsia-500 to-pink-500',

];



const ProductImage = React.memo(function ProductImage({ product, large = false, priority = false }) {
  const [activeImage, setActiveImage] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const images = [];
  if (product.image) images.push(product.image);
  if (product.gallery_images) {
      product.gallery_images.forEach(g => {
         if (g.image && g.image !== product.image) images.push(g.image);
      });
  }

  // Fallback for pumpkin seeds if image is dummyimage or broken
  if (images.length === 0 || images[0]?.includes('dummyimage.com')) {
    if (product.name?.toLowerCase().includes('pumpkin')) {
      images[0] = '/media/products/pumpkin_seeds.jpg';
    }
  }

  if (images.length > 0) {
    if (large && images.length > 1) {
       return (
          <div className="flex flex-col h-full w-full items-center justify-center">
            <div className="w-full flex items-center justify-center relative overflow-hidden bg-white/60 dark:bg-slate-800/40 rounded-2xl h-64 sm:h-72 md:h-80">
              <img 
                loading="lazy"
                decoding="async"
                src={optimizeImage(images[activeImage], 600)} 
                onError={(e) => {
                  if (product.name?.toLowerCase().includes('pumpkin') && !e.currentTarget.src.includes('pumpkin_seeds.jpg')) {
                    e.currentTarget.src = '/media/products/pumpkin_seeds.jpg';
                  }
                }}
                className="max-h-full max-w-full object-contain drop-shadow-sm p-3 transition-all duration-300" 
                alt={product.name}
              />
            </div>
            <div className="flex gap-2 p-2 mt-2 overflow-x-auto w-full justify-center">
               {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden shadow-xs transition-all border ${activeImage === i ? 'ring-2 ring-emerald-600 border-emerald-500 opacity-100' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'}`}>
                     <img 
                       loading="lazy"
                       decoding="async"
                       src={optimizeImage(img, 100)} 
                       onError={(e) => {
                         if (product.name?.toLowerCase().includes('pumpkin') && !e.currentTarget.src.includes('pumpkin_seeds.jpg')) {
                           e.currentTarget.src = '/media/products/pumpkin_seeds.jpg';
                         }
                       }}
                       className="w-full h-full object-contain p-1" 
                       alt=""
                     />
                  </button>
               ))}
            </div>
          </div>
       );
    }
    
    return (
       <div className={`w-full flex items-center justify-center relative overflow-hidden ${large ? 'h-64 sm:h-72 md:h-80 bg-white/60 dark:bg-slate-800/40 rounded-2xl' : 'h-32 sm:h-36 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/50'}`}>
           <div className={`absolute inset-0 bg-slate-100 dark:bg-slate-800 transition-opacity duration-300 ${imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-pulse'}`} />
           {!large && <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 rounded-t-xl z-10 mix-blend-overlay"></div>}
           <img 
             loading={priority ? 'eager' : 'lazy'}
             fetchPriority={priority ? 'high' : undefined}
             decoding='async' 
             src={optimizeImage(images[0], large ? 600 : 300)} 
             alt={product.name} 
             onLoad={() => setImageLoaded(true)}
             onError={(e) => {
               setImageLoaded(true);
               if (product.name?.toLowerCase().includes('pumpkin') && !e.currentTarget.src.includes('pumpkin_seeds.jpg')) {
                 e.currentTarget.src = '/media/products/pumpkin_seeds.jpg';
               }
             }}
             className={large ? `max-h-full max-w-full object-contain drop-shadow-sm p-3 transition-transform duration-300 hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}` : `w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal transition-transform duration-700 group-hover/card:scale-110 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
           />
       </div>
    );
  }

  return <div className={`grid w-full place-items-center bg-slate-100 dark:bg-slate-800 text-3xl font-bold text-slate-300 dark:text-slate-600 rounded-2xl ${large ? 'h-64 sm:h-72 md:h-80' : 'h-32 sm:h-36'}`}>{product.name?.charAt(0)?.toUpperCase()}</div>
});



function SearchBox({ value, onChange }) {

 return <div className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-4 shadow-sm focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100 transition-all duration-300"><Search className="text-slate-400 group-focus-within:text-slate-400 transition-colors"size={20} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search rice, milk, snacks..."className="min-h-12 w-full bg-transparent text-sm outline-none font-medium"/>{value && <button onClick={() => onChange('')} className="p-1 text-slate-500 hover:text-red-500 transition-colors"><X size={18} /></button>}</div>

}



export const ProductCard = React.memo(function ProductCard({ product, priority = false, ...props }) {

  const { favorites, toggleFavorite, isCustomer, add, cart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const price = product.offer_price || product.regular_price
  const isFav = favorites?.find(f => f.product === product.id || f.product?.id === product.id || f.id === product.id);

  const cartItem = cart?.items?.find(item => item.product === product.id);
  const maxAllowed = product.max_order_quantity > 0 ? Math.min(product.stock_quantity, product.max_order_quantity) : product.stock_quantity;
  const isMaxReached = cartItem && cartItem.quantity >= maxAllowed;

  const regPrice = Number(product.regular_price);
  const offPrice = Number(product.offer_price);
  const discountPercent = product.offer_price && regPrice > offPrice 
    ? Math.round(((regPrice - offPrice) / regPrice) * 100) 
    : 0;
  const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCustomer) { navigate('/login'); return; }
    setAdding(true);
    try {
      await add(product);
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add to cart.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div {...props} className="group/card relative overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 hover:border-slate-200 hover:ring-2 hover:ring-emerald-100 flex flex-col h-full">
      {discountPercent > 0 && (
        <div className="absolute top-0 left-0 z-10 bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-br-xl rounded-tl-xl shadow-lg tracking-wider flex items-center gap-1">
          <Zap size={10} fill="currentColor" />
          {discountPercent}% OFF
        </div>
      )}

      {isCustomer && (
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }} 
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          className="absolute top-2 right-2 z-10 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md transition-all hover:scale-125 hover:bg-white active:scale-95 cursor-pointer"
        >
          <Heart size={18} fill={isFav ? "currentColor" : "none"} className={isFav ? "text-rose-500 drop-shadow-sm" : "text-slate-300"} />
        </button>
      )}

      <Link to={`/product/${product.id}`} className="flex flex-col flex-grow">
        <div className={`overflow-hidden bg-slate-50 relative rounded-t-2xl ${isOutOfStock ? "grayscale opacity-80" : ""}`}>
          {isOutOfStock && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl tracking-widest whitespace-nowrap border border-white/20">
              OUT OF STOCK
            </div>
          )}
          <ProductImage product={product} priority={priority} />
        </div>

        <div className="p-3 pb-1 flex flex-col flex-grow bg-white">
          <p className="line-clamp-2 text-sm font-bold leading-tight text-slate-800 dark:text-slate-100 group-hover/card:text-emerald-600 dark:group-hover/card:text-emerald-400 transition-colors">{product.name}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">{product.brand && `${product.brand} · `}{product.unit}</p>

          {product.tags && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.tags.split(',').map((tag, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 text-[9px] font-extrabold uppercase tracking-widest rounded-md">{tag.trim()}</span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-3 flex items-center gap-2 mb-1">
            <span className="text-lg font-black text-slate-900 dark:text-white">₹{price}</span>
            {Boolean(product.offer_price) && regPrice > offPrice && (
              <span className="text-xs text-slate-400 line-through font-semibold">₹{product.regular_price}</span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-3 pt-0 bg-white">
        {(!isOutOfStock) ? (
          <button 
            type="button"
            onClick={handleAddToCart}
            disabled={adding || added || isMaxReached}
            className={`w-full rounded-xl py-2.5 min-h-[44px] sm:min-h-0 sm:py-2 text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${added ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs' : isMaxReached ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg shadow-emerald-600/20 shadow-md'} disabled:opacity-60 disabled:active:scale-100 cursor-pointer`}
          >
            {isMaxReached ? 'Max in cart' : added ? <><Check size={14} className="stroke-[2.5]" /> Added</> : adding ? <><Loader2 size={14} className="animate-spin" /> Adding...</> : <><ShoppingCart size={14} className="stroke-[2.5]" /> Add to Cart</>}
          </button>
        ) : (
          <div className="w-full text-center rounded-xl bg-slate-50 border border-slate-100 py-2 text-sm font-extrabold text-slate-400">
            Out of stock
          </div>
        )}
      </div>
    </div>
  );
});



export function ProductSkeleton() {

 return (

 <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-3 animate-pulse h-full flex flex-col min-h-[280px]">

 <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl h-32 sm:h-36 w-full mb-3"></div>

 <div className="h-4 bg-slate-100 rounded-lg w-3/4 mb-2"></div>

 <div className="h-3 bg-slate-100 rounded-lg w-1/2 mb-4"></div>

 <div className="mt-auto">

 <div className="h-5 bg-slate-100 rounded-lg w-1/3 mb-3"></div>

 <div className="h-10 bg-slate-50 rounded-xl w-full"></div>

 </div>

 </div>

 );

}



export function CategorySkeleton() {

 return (

 <div className="aspect-square sm:aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse border border-slate-200 shadow-sm w-full h-full"></div>

 );

}



export function HomeCategorySkeleton() {

 return (

 <div className="w-24 h-24 sm:w-32 sm:h-24 md:w-40 md:h-[120px] shrink-0 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse border border-slate-100"></div>

 );

}



function BannerCarousel({ banners }) {

 const [currentIndex, setCurrentIndex] = useState(0);



 useEffect(() => {

 if (banners.length <= 1) return;

 const timer = setInterval(() => {

 setCurrentIndex(prev => (prev + 1) % banners.length);

 }, 4000);

 return () => clearInterval(timer);

 }, [banners.length]);



 if (!banners.length) return null;



 return (

 <section className="relative overflow-hidden group bg-slate-100 w-full mb-2 sm:mb-6 shadow-sm">

 <div 

 className="flex transition-transform duration-500 ease-out h-full"

 style={{ transform: `translateX(-${currentIndex * 100}%)` }}

 >

 {banners.map((banner, index) => (
  <a 
  key={banner.id} 
  href={banner.link || '#'} 
  className="w-full flex-shrink-0 block aspect-[16/7] sm:aspect-[21/9] md:aspect-[4/1] max-h-[180px] sm:max-h-[200px] md:max-h-[240px]"
  >
  <img 
  loading={index === 0 ? 'eager' : 'lazy'} 
  decoding={index === 0 ? 'sync' : 'async'}
  fetchPriority={index === 0 ? 'high' : 'auto'}
  src={optimizeImage(banner.image, 1200)} 
  alt={banner.title} 
  className="w-full h-full object-cover"
  />
  </a>
  ))}
 </div>

 

 {banners.length > 1 && (

 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">

 {banners.map((_, idx) => (

 <button

 key={idx}

 onClick={() => setCurrentIndex(idx)}

 className={`h-2 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-8 bg-white shadow-lg' : 'w-2 bg-white/60 hover:bg-white'}`}

 aria-label={`Go to slide ${idx + 1}`}

 />

 ))}

 </div>

 )}

 </section>

 );

}



export function HomePage() {

    const initCats = readCacheSync('/categories/');
  const [categories, setCategories] = useState(initCats ? (initCats.results || initCats) : []);

  const initBanners = readCacheSync('/offers/banners/');
  const [banners, setBanners] = useState(initBanners ? (initBanners.results || initBanners) : []);

  const initSettings = readCacheSync('/store/settings/');
  const [settings, setSettings] = useState(initSettings || null);

  const initSectionsRaw = readCacheSync('/store/homepage-sections/');
  const [sections, setSections] = useState(() => {
    if (!initSectionsRaw) return [];
    const d = initSectionsRaw.results || initSectionsRaw || [];
    const mapped = d.map(sec => ({
      ...sec,
      items: (sec.section_products || []).sort((a, b) => a.position - b.position).map(sp => sp.product_details)
    }));
    return mapped.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order);
  });

  const [loading, setLoading] = useState(() => !initCats || !initBanners || !initSectionsRaw);
  const [error, setError] = useState('');



  useEffect(() => {

    const fetchAll = async () => {
      try {
        const [catsRes, bannersRes, settingsRes, sectionsRes] = await Promise.allSettled([
          api.get('/categories/'),
          api.get('/offers/banners/'),
          api.get('/store/settings/'),
          api.get('/store/homepage-sections/')
        ]);

        if (catsRes.status === 'fulfilled') setCategories(unpack(catsRes.value));
        if (bannersRes.status === 'fulfilled') setBanners(unpack(bannersRes.value));
        if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value.data);
        if (sectionsRes.status === 'fulfilled') {
          const d = sectionsRes.value.data.results || sectionsRes.value.data || [];
          const mapped = d.map(sec => ({
            ...sec,
            items: (sec.section_products || []).sort((a, b) => a.position - b.position).map(sp => sp.product_details)
          }));
          setSections(mapped.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order));
        }
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    };

    

    fetchAll();

    

    // Poll every 30s for Live Broadcasts & Out of Stock updates
    const intervalId = setInterval(() => {
      if (!document.hidden) fetchAll();
    }, 30000);

    return () => clearInterval(intervalId);

  }, []);



  // Helper to strip any emojis from titles globally
  const stripEmojis = (str) => str ? str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '').trim() : '';



  return <CustomerLayout>

  <div className="w-full">

    <BannerCarousel banners={banners} />

   

    {banners.length === 0 && (

    <GSAPFadeUp delay={0.2}>

    <section className="bg-emerald-800 text-white shadow-xl relative overflow-hidden w-full mb-6 max-h-[200px] md:max-h-[240px] flex flex-col justify-center">

    {/* Animated decorative shapes */}

    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 rounded-full bg-white/10 animate-pulse"></div>

    <div className="absolute bottom-0 right-20 -mb-8 w-32 h-32 rounded-full bg-white/10 animate-pulse" style={{animationDelay: '1s'}}></div>

    <div className="absolute top-1/2 left-10 w-16 h-16 rounded-full bg-yellow-400/20 animate-bounce" style={{animationDuration: '3s'}}></div>

    <div className="absolute top-4 right-32 text-4xl opacity-20 animate-bounce" style={{animationDuration: '2.5s'}}>🛒</div>

    <div className="absolute bottom-6 right-8 text-3xl opacity-20 animate-bounce" style={{animationDuration: '3.5s'}}>🥬</div>

    

    <div className="relative z-10 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-12">

    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-2">

      <Sparkles size={12} className="text-yellow-300" />

      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white">{settings?.store_name || 'Narendra Kirana Store'}</p>

    </div>

    <h1 className="max-w-2xl text-2xl font-extrabold leading-tight sm:text-4xl text-white tracking-tight drop-shadow-sm">Everyday essentials, <span className="text-yellow-300">ready when you are.</span></h1>

    <p className="mt-2 max-w-xl text-sm text-emerald-100 font-medium leading-relaxed hidden sm:block">Order online and collect from your local store. Quality products, straightforward pricing, and reliable service.</p>

    <Link to="/products" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-slate-800 transition-all hover:bg-slate-100 hover:text-slate-800 active:scale-95 shadow-md hover:shadow-lg group">

      Explore Catalog <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>

    </Link>

    </div>

    </section>

    </GSAPFadeUp>

    )}

  </div>



  <main className="w-full px-4 pb-5 sm:px-6 sm:pb-8 lg:px-8 xl:px-12">

  

  {error && <GSAPFadeUp><p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100 mb-6">{error}</p></GSAPFadeUp>}



  {/* Categories */}

  <section className="mt-1 relative">

  <div className="flex justify-between items-center py-2">

    <div className="flex items-center gap-2">

      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Shop by category</h2>

    </div>

    <Link to="/products" className="text-xs font-bold text-slate-500 hover:text-slate-600 transition flex items-center gap-1">See all <ChevronRight size={14} /></Link>

  </div>

  

  {loading ? (

    <div className="mt-4 flex gap-3 overflow-x-auto pb-4 hide-scrollbar">

      {Array.from({length: 5}).map((_, i) => <HomeCategorySkeleton key={i} />)}

    </div>

  ) : (

    <GSAPZoomIn className="mt-4 flex gap-3 overflow-x-auto pb-4 hide-scrollbar" stagger={0.05}>

      {categories.map((category, index) => (

        <Link 

          key={category.id} 

          to={`/products?category=${category.id}`} 

          className="w-24 h-24 sm:w-32 sm:h-24 md:w-40 md:h-[120px] flex flex-col items-center justify-end p-2 sm:p-3 relative rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:scale-105 group shrink-0"

        >

        <div className="absolute inset-0">

          {category.image ? (

            <img loading='lazy' decoding='async' src={optimizeImage(category.image, 300)} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>

          ) : (

            <div className={`w-full h-full bg-gradient-to-br ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`}></div>

          )}

          <div className={`absolute inset-0 ${category.image ? 'bg-gradient-to-t from-black/80 via-black/30 to-transparent' : 'bg-black/20'} group-hover:from-black/90 group-hover:via-black/40 transition-all duration-500`} />

        </div>

        <div className="relative z-10 w-full text-center text-xs sm:text-sm leading-tight font-extrabold text-white drop-shadow-md line-clamp-2 break-words">

          {category.name}

        </div>

      </Link>

      ))}

    </GSAPZoomIn>

  )}

  </section>

  

  {/* Dynamic Homepage Sections (Horizontal Scrollable Carousel) */}
  {sections.length === 0 && loading ? (
    <div className="space-y-6 mt-4">
      {[1, 2].map((placeholderKey) => (
        <div key={placeholderKey} className={placeholderKey === 1 ? "relative" : "pt-4 sm:pt-6 border-t border-slate-100 relative"}>
          <div className="flex justify-between items-center py-2">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          </div>
          <div className="mt-3 flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-0.5 hide-scrollbar">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[160px] sm:w-[190px] md:w-[210px] shrink-0">
                <ProductSkeleton />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ) : (
    sections.map((section, sectionIndex) => {
      const sectionProducts = (section.items || []).filter(item => item && item.is_in_stock);

      if (sectionProducts.length === 0 && !loading) return null;

    return (
      <GSAPFadeUp key={section.id} delay={0.05} className="w-full">
      <section className={sectionIndex === 0 ? "mt-4 relative" : "mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 relative"}>
          <div className="sticky top-[56px] sm:top-[68px] z-20 bg-slate-50/95 dark:bg-[#090d16]/95 backdrop-blur-sm py-2 flex justify-between items-center transition-colors">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{stripEmojis(section.title)}</h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {sectionProducts.length}
              </span>
            </div>

            <Link 
              to={`/products?section=${section.id}&section_title=${encodeURIComponent(stripEmojis(section.title))}`} 
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center gap-1"
            >
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
              {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="w-[160px] sm:w-[190px] md:w-[210px] shrink-0">
                  <ProductSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative group/carousel mt-3">
              {/* Left Scroll Arrow (Desktop) */}
              {sectionProducts.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`carousel-${section.id}`);
                    if (el) el.scrollBy({ left: -320, behavior: 'smooth' });
                  }}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 dark:bg-slate-800 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all opacity-0 group-hover/carousel:opacity-100 z-10 hidden sm:flex"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Horizontal Scroll Row (Scroll Left / Right) */}
              <div 
                id={`carousel-${section.id}`}
                className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-0.5 hide-scrollbar snap-x snap-mandatory scroll-smooth"
              >
                {sectionProducts.map((product, index) => (
                  <div key={product.id} className="w-[160px] sm:w-[190px] md:w-[210px] shrink-0 snap-start">
                    <ProductCard product={product} priority={sectionIndex === 0 && index < 2} />
                  </div>
                ))}
              </div>

              {/* Right Scroll Arrow (Desktop) */}
              {sectionProducts.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`carousel-${section.id}`);
                    if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
                  }}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 dark:bg-slate-800 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all opacity-0 group-hover/carousel:opacity-100 z-10 hidden sm:flex"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          )}
      </section>
      </GSAPFadeUp>
    );
  }))}

  

  </main></CustomerLayout>

}



export function CategoriesPage() {

 const navigate = useNavigate();

 const initCats = readCacheSync('/categories/');
 const [categories, setCategories] = useState(initCats ? (initCats.results || initCats) : []);
 const [loading, setLoading] = useState(() => !initCats);



 useEffect(() => {

 api.get('/categories/').then(res => {

 setCategories(unpack(res));

 }).catch(console.error).finally(() => setLoading(false));

 }, []);



  return (
  <CustomerLayout>
    <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 pb-24 md:pb-12">
    <div className="w-full mb-6 flex flex-col items-start gap-2">
      <button onClick={() => navigate(-1)} className="text-xs sm:text-sm font-bold text-slate-600 hover:underline bg-transparent border-none cursor-pointer py-2 px-1 flex items-center gap-1"><ArrowLeft size={16} /> Back</button>
      <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">All Categories</h1>
    </div>
    {loading ? (
   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3 sm:gap-4 w-full">
   {Array.from({length: 24}).map((_, i) => <CategorySkeleton key={i} />)}
   </div>
   ) : (
   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3 sm:gap-4 w-full">
   {categories.map((category, index) => {

  return (

  <Link 

  key={category.id} 

  to={`/products?category=${category.id}`} 

 className="aspect-square sm:aspect-[4/3] flex flex-col items-center justify-end p-2 sm:p-3 relative rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:scale-105 group bg-slate-50 w-full"

 >

 <div className="absolute inset-0">

 {category.image ? (

 <img loading='lazy' decoding='async' src={optimizeImage(category.image, 300)} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>

 ) : (

 <div className={`w-full h-full bg-gradient-to-br ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`}>

   <div className="w-full h-full flex items-center justify-center opacity-30">

     <span className="text-6xl font-black text-white">{category.name.charAt(0)}</span>

   </div>

 </div>

 )}

 <div className={`absolute inset-0 ${category.image ? 'bg-gradient-to-t from-black/80 via-black/30 to-transparent' : ''} group-hover:from-black/90 group-hover:via-black/40 transition-all duration-500`} />

 </div>

 <div className="relative z-10 w-full text-center text-sm sm:text-base leading-tight font-extrabold text-white drop-shadow-lg line-clamp-2 break-words">

 {category.name}

 </div>

 </Link>

 );

 })}

 </div>

 )}

 </main>

 </CustomerLayout>

 );

}



export function ProductsPage() {

  const [searchParams, setSearchParams] = useSearchParams(); 
  const query = searchParams.get('search') || ''; 
  const category = searchParams.get('category') || '';
  const section = searchParams.get('section') || '';
  const sectionTitle = searchParams.get('section_title') || '';
  const [sortOption, setSortOption] = useState('default'); 
  const [error, setError] = useState(''); 

  const params = {};
  if (query) params.search = query;
  if (category) params.category = category;
  if (section) params.section = section;

  const initCats = readCacheSync('/categories/');
  const [categories, setCategories] = useState(initCats ? (initCats.results || initCats) : []);

  const initProducts = readCacheSync('/products/', { params });
  const [products, setProducts] = useState(initProducts ? (initProducts.results || initProducts) : []);
  const [loading, setLoading] = useState(() => !initProducts);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [nextPage, setNextPage] = useState(initProducts ? initProducts.next : null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    api.get('/categories/').then(res => setCategories(unpack(res))).catch(console.error);
  }, []);

  useEffect(() => {
    const params = {};
    if (query) params.search = query;
    if (category) params.category = category;
    if (section) params.section = section;

    const cached = readCacheSync('/products/', { params });
    if (cached) {
      setProducts(cached.results || cached || []);
      setNextPage(cached.next || null);
      setLoading(false);
      setIsRevalidating(true);
    } else {
      setLoading(true);
    }
    
    const timer = setTimeout(() => {
      api.get('/products/', { params })
         .then(res => { 
           setProducts(res.data.results || res.data || []); 
           setNextPage(res.data.next || null);
           setError(''); 
         })
         .catch(() => setError('Could not load products.'))
         .finally(() => { 
           setLoading(false); 
           setIsRevalidating(false);
         });
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, category, section]);

  const loadMore = useCallback(() => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    api.get(nextPage)
      .then(res => {
        setProducts(prev => [...prev, ...(res.data.results || [])]);
        setNextPage(res.data.next || null);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  }, [nextPage, loadingMore]);

  function updateSearch(value) { const next = new URLSearchParams(searchParams); if (value) next.set('search', value); else next.delete('search'); setSearchParams(next) }

  const activeCategoryName = sectionTitle
    ? sectionTitle
    : (category && categories.length ? categories.find(c => String(c.id) === category)?.name : 'All products');

  const sortedProducts = useMemo(() => {
    if (sortOption === 'default') return products;
    return [...products].sort((a, b) => {
      const priceA = parseFloat(a.offer_price || a.regular_price);
      const priceB = parseFloat(b.offer_price || b.regular_price);
      if (sortOption === 'price_low') return priceA - priceB;
      if (sortOption === 'price_high') return priceB - priceA;
      if (sortOption === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return 0;
    });
  }, [products, sortOption]);

  return (
  <CustomerLayout>
    <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 pb-24 md:pb-12">
      <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 bg-slate-50 dark:bg-slate-900/50 py-3 mb-6 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar items-center">
          <Link to="/" className="flex shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition w-8 h-8 mr-1" aria-label="Back to home"><ArrowLeft size={16} /></Link>
          <button 
            onClick={() => { 
              const next = new URLSearchParams(searchParams); 
              next.delete('category'); 
              next.delete('section'); 
              next.delete('section_title'); 
              setSearchParams(next); 
            }} 
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all ${!category && !section ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            All
          </button>

          {sectionTitle && (
            <span className="rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 bg-emerald-600 text-white shadow-xs flex items-center gap-1.5">
              <span>{sectionTitle}</span>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('section');
                  next.delete('section_title');
                  setSearchParams(next);
                }}
                className="hover:text-emerald-200 cursor-pointer font-black text-xs leading-none"
                title="Clear section filter"
              >
                ✕
              </button>
            </span>
          )}

          {categories.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { 
                const next = new URLSearchParams(searchParams); 
                next.set('category', item.id); 
                next.delete('section'); 
                next.delete('section_title'); 
                setSearchParams(next); 
              }} 
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold shrink-0 transition-all ${category === String(item.id) ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">{activeCategoryName}</h1>
        {!loading && (
          <div className="flex items-center gap-2">
            {isRevalidating && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Syncing...
              </span>
            )}
            <select 
              value={sortOption} 
              onChange={e => setSortOption(e.target.value)}
              className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            >
              <option value="default">Relevance</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{products.length} items</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 dark:bg-rose-950/40 p-4 border border-red-200/60 dark:border-rose-900/40 flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-red-700 dark:text-rose-300 font-semibold">{error}</p>
          <button 
            type="button"
            onClick={() => {
              setError('');
              setLoading(true);
              api.get('/products/', { params })
                .then(res => setProducts(res.data.results || res.data || []))
                .catch(() => setError('Could not load products.'))
                .finally(() => setLoading(false));
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-red-700 dark:text-rose-300 border border-red-200 dark:border-rose-800 hover:bg-red-50 transition cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-3 sm:gap-4 w-full">
          {Array.from({length: 12}).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : sortedProducts.length > 0 ? (
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-3 sm:gap-4 w-full">
          {sortedProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 6} />)}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl bg-white dark:bg-slate-900 p-8 sm:p-12 text-center border border-slate-200/80 dark:border-slate-800 flex flex-col items-center max-w-lg mx-auto shadow-xs">
          <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
            <PackageSearch size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">No products found</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed">
            {query 
              ? `We could not find items matching "${query}". Try checking your spelling or clear active filters.`
              : "There are no products available under this category or section at the moment."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchParams({});
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}
      
      {nextPage && (
        <div className="flex justify-center mt-8 pb-6">
          <button 
            onClick={loadMore} 
            disabled={loadingMore} 
            className="bg-slate-900 dark:bg-slate-800 dark:border dark:border-slate-700 text-white hover:bg-black dark:hover:bg-slate-700 transition-colors px-8 py-3 rounded-xl font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px] text-xs sm:text-sm cursor-pointer"
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2 text-emerald-400" />
                <span>Loading more products...</span>
              </>
            ) : (
              <span>Load More</span>
            )}
          </button>
        </div>
      )}

    </main>

  </CustomerLayout>

  )

}



export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add, update, isCustomer, favorites, toggleFavorite, cart } = useCart();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setProduct(null);
    setError('');
    api.get(`/products/${id}/`)
      .then((response) => setProduct(response.data))
      .catch(() => setError('This product is unavailable or no longer active.'));
  }, [id]);

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} - Narendra Kirana`,
          text: `Check out ${product.name} on Narendra Kirana!`,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Product link copied to clipboard!');
    }
  };

  async function addToCart() {
    if (!isCustomer) {
      navigate('/login');
      return;
    }
    setAdding(true);
    try {
      await add(product);
      setAdded(true);
      toast.success('Added to cart');
      setTimeout(() => setAdded(false), 2500);
    } catch (requestError) {
      toast.error(requestError.response?.data?.detail || 'Could not add this item.');
    } finally {
      setAdding(false);
    }
  }

  // Error State - bounded in stable max-w-4xl
  if (error) {
    return (
      <CustomerLayout>
        <main className="w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-12">
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors mb-6 bg-transparent border-none cursor-pointer py-2 px-1"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back
          </button>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Product Not Found</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition"
            >
              Browse All Products
            </Link>
          </div>
        </main>
      </CustomerLayout>
    );
  }

  // Loading Skeleton State
  if (!product) {
    return (
      <CustomerLayout>
        <main className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-4" />
          <div className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row">
            <div className="w-full md:w-[380px] lg:w-[400px] shrink-0 bg-slate-50 dark:bg-slate-800/40 p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
              <div className="w-full aspect-square max-h-[280px] bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            </div>
            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                  <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
                <div className="h-7 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-6" />
                <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-6" />
                <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse mb-6" />
              </div>
              <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            </div>
          </div>
        </main>
      </CustomerLayout>
    );
  }

  const price = product.offer_price || product.regular_price;
  const isFav = favorites?.find((f) => f.product === product.id || f.product?.id === product.id || f.id === product.id);
  const regPrice = Number(product.regular_price);
  const offPrice = Number(product.offer_price);
  const discountPercent = product.offer_price && regPrice > offPrice ? Math.round(((regPrice - offPrice) / regPrice) * 100) : 0;
  const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;
  const cartItem = cart?.items?.find((item) => item.product === product.id);
  const maxAllowed = product.max_order_quantity > 0 ? Math.min(product.stock_quantity, product.max_order_quantity) : product.stock_quantity;
  const isMaxReached = cartItem && cartItem.quantity >= maxAllowed;

  return (
    <CustomerLayout>
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 pb-36 md:pb-12">
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors mb-4 bg-transparent border-none cursor-pointer py-2 px-1"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back
        </button>

        <article className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-800 relative flex flex-col md:flex-row transition-colors w-full">
          {/* Stable Minimal Image Frame */}
          <div className="w-full md:w-1/2 bg-slate-50/80 dark:bg-slate-800/30 p-6 sm:p-10 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/60">
            {discountPercent > 0 && (
              <div className="absolute top-3.5 left-3.5 z-10 bg-rose-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-xs flex items-center gap-1 uppercase tracking-wider">
                <Zap size={11} fill="currentColor" /> {discountPercent}% OFF
              </div>
            )}
            <ProductImage product={product} large />
          </div>

          {/* Stable Info Frame */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Category + Stock + Favorite */}
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                    {product.category_name || 'Grocery'}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isOutOfStock
                        ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Share product"
                    aria-label="Share product"
                  >
                    <Share2 size={20} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" />
                  </button>
                  {isCustomer && (
                    <button
                      type="button"
                      onClick={() => toggleFavorite(product.id)}
                      className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        size={22}
                        fill={isFav ? 'currentColor' : 'none'}
                        className={isFav ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600 hover:text-rose-400'}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Brand/Unit */}
              <h1 className="mt-3 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {product.name}
              </h1>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                {product.brand && `${product.brand} · `}{product.unit}
              </p>

              {/* Tags */}
              {product.tags && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {product.tags.split(',').map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-md"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Pricing */}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">₹{price}</span>
                {product.offer_price && regPrice > offPrice && (
                  <>
                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500 line-through">₹{regPrice}</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Save ₹{regPrice - offPrice}
                    </span>
                  </>
                )}
              </div>

              {/* Add to Cart / Quantity Stepper */}
              <div className="mt-5">
                {cartItem ? (
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-1">
                      <button
                        type="button"
                        onClick={() => update(cartItem, cartItem.quantity - 1)}
                        className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-xs hover:bg-emerald-100 dark:hover:bg-slate-700 transition font-bold cursor-pointer"
                        title="Decrease"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="w-10 text-center font-black text-emerald-800 dark:text-emerald-300 text-sm">
                        {cartItem.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => update(cartItem, cartItem.quantity + 1)}
                        disabled={isMaxReached}
                        className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-bold cursor-pointer"
                        title="Increase"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Check size={14} /> In your cart
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={addToCart}
                    disabled={isOutOfStock || adding || isMaxReached}
                    className={`w-full py-3 px-5 rounded-xl font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
                      isOutOfStock
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                        : isMaxReached
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    {adding ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : isOutOfStock ? (
                      'Out of Stock'
                    ) : isMaxReached ? (
                      'Max in cart'
                    ) : (
                      <>
                        <ShoppingCart size={16} /> Add to Cart · ₹{price}
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Kirana Perks Strip */}
              <div className="grid grid-cols-3 gap-2 py-3 my-4 border-y border-slate-100 dark:border-slate-800 text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <Zap size={14} className="text-amber-500" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Fast Delivery</span>
                  <span className="text-[10px] text-slate-400">Within 30 mins</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 border-x border-slate-100 dark:border-slate-800">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">100% Fresh</span>
                  <span className="text-[10px] text-slate-400">Store Guaranteed</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Tag size={14} className="text-blue-500" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Best Price</span>
                  <span className="text-[10px] text-slate-400">Direct Kirana</span>
                </div>
              </div>
            </div>

            {/* Product Description - bounded height with clean scrolling */}
            <div className="pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                Product Details
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-h-28 overflow-y-auto pr-1 whitespace-pre-line">
                {product.description || 'Fresh, quality daily essentials from Narendra Kirana Store.'}
              </p>
            </div>
          </div>
        </article>

        {/* Mobile Sticky Add to Cart Bar (strictly mobile: md:hidden) */}
        <div className="md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          {cartItem ? (
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-1">
                <button
                  type="button"
                  onClick={() => update(cartItem, cartItem.quantity - 1)}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold cursor-pointer"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-black text-emerald-800 dark:text-emerald-300 text-sm">
                  {cartItem.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => update(cartItem, cartItem.quantity + 1)}
                  disabled={isMaxReached}
                  aria-label="Increase quantity"
                  className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold disabled:opacity-40 cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button
                onClick={() => navigate('/cart')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                View Cart ({cart?.items?.length || 1}) →
              </button>
            </div>
          ) : (
            <button
              onClick={addToCart}
              disabled={isOutOfStock || adding || isMaxReached}
              className={`w-full min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-extrabold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${
                isOutOfStock
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                  : isMaxReached
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {adding ? (
                'Adding...'
              ) : isOutOfStock ? (
                'Out of Stock'
              ) : isMaxReached ? (
                'Max in cart'
              ) : (
                <>
                  <ShoppingCart size={16} /> Add to Cart · ₹{price}
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </CustomerLayout>
  );
}

