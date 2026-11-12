import { useState, useEffect, lazy, Suspense } from 'react';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Package, GripVertical, Camera, Sparkles, Wand2, FileText, ScanLine, Search, Globe, Loader2, ArrowRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';
import { createPortal } from 'react-dom';
import { compressImage } from '../../utils/compress';

const BarcodeScanner = lazy(() => import('../../components/BarcodeScanner'));

const QUICK_SEARCH_SUGGESTIONS = [
  'Aashirvaad Atta',
  'Amul Butter',
  'Maggi Noodles',
  'Nutella Spread',
  'Basmati Rice',
  'Tata Salt',
  'Dettol Soap'
];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', category: '', brand: '', description: '', unit: '',
    regular_price: '', offer_price: '', is_active: true, is_in_stock: true,
    stock_quantity: 0, sku: '', cost_price: '', expiry_date: '', tags: '',
    max_order_quantity: 10, image: null, image_url: '', gallery_images: [], imageBack: null
  });
  const [galleryCropQueue, setGalleryCropQueue] = useState([]);
  const [activeGalleryCropFile, setActiveGalleryCropFile] = useState(null);

  // Online grocery search states
  const [isOnlineSearchOpen, setIsOnlineSearchOpen] = useState(false);
  const [onlineQuery, setOnlineQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [hasSearchedOnline, setHasSearchedOnline] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isOnlineSearchOpen) {
          setIsOnlineSearchOpen(false);
        } else if (isFormOpen) {
          closeForm();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen, isOnlineSearchOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([api.get('/products/?page_size=200'), api.get('/categories/')]);
      setProducts(prodRes.data.results || prodRes.data);
      setCategories(catRes.data.results || catRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error(err.response?.data?.detail || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAIPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    toast.loading('AI is analyzing the product...', { id: 'ai-scan' });
    const uploadData = new FormData();
    uploadData.append('image', file);
    
    try {
      const res = await api.post('/products/vision_lookup/', uploadData);
      toast.dismiss('ai-scan');
      if (res.data.success) {
        toast.success('AI successfully extracted details!');
        openForm(null);
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            name: res.data.product.name || '',
            brand: res.data.product.brand || '',
            unit: res.data.product.unit || '',
            description: res.data.product.description || ''
          }));
        }, 100);
      } else {
        toast.error(res.data.error || 'AI could not read the product.');
      }
    } catch (err) {
      toast.dismiss('ai-scan');
      toast.error('AI Scan failed. Check connection.');
    }
    e.target.value = '';
  };

  const matchCategory = (categorySuggestion) => {
    if (!categorySuggestion || !categories.length) return '';
    const suggestionLower = categorySuggestion.toLowerCase().trim();
    // Try exact match first
    const exact = categories.find(c => c.name.toLowerCase() === suggestionLower);
    if (exact) return exact.id;
    // Try substring match
    const partial = categories.find(c =>
      c.name.toLowerCase().includes(suggestionLower) || suggestionLower.includes(c.name.toLowerCase())
    );
    if (partial) return partial.id;
    return categories[0]?.id || '';
  };

  const handleResetCatalog = async () => {
    if (!window.confirm('Reset and seed 100 authentic Kirana products across 12 categories? This will replace old test products.')) return;
    const toastId = toast.loading('Seeding 100 authentic products...');
    try {
      const res = await api.post('/products/reset_and_seed_catalog/');
      toast.success(res.data.message || '100 products seeded successfully!', { id: toastId });
      fetchData();
    } catch (err) {
      toast.error('Failed to seed catalog: ' + (err.response?.data?.error || err.message), { id: toastId });
    }
  };

  const handleBarcodeScan = async (decodedText) => {
    setIsScanning(false);
    toast.loading('Looking up product...', { id: 'scan-toast' });
    try {
      const res = await api.get(`/products/barcode_lookup/?barcode=${encodeURIComponent(decodedText)}`);
      toast.dismiss('scan-toast');
      if (res.data.source === 'local') {
        toast.success('Found in inventory! You can update stock.');
        openForm(res.data.product);
      } else if (res.data.source === 'external') {
        const prod = res.data.product || {};
        toast.success('Found product online! Auto-filling details...');
        const matchedCatId = matchCategory(prod.category_suggestion);
        openForm(null);
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            name: prod.name || '',
            brand: prod.brand || '',
            unit: prod.unit || '',
            sku: prod.sku || decodedText,
            description: prod.description || '',
            image_url: prod.image_url || '',
            category: matchedCatId || prev.category || ''
          }));
        }, 100);
      } else {
        toast.error('Product not found online. Please add manually.');
        openForm(null);
        setTimeout(() => setFormData(prev => ({ ...prev, sku: decodedText })), 100);
      }
    } catch (e) {
      toast.dismiss('scan-toast');
      toast.error('Error looking up barcode');
    }
  };

  const handleOnlineSearch = async (e, customQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const queryToSearch = customQuery !== null ? customQuery : onlineQuery;
    if (!queryToSearch || !queryToSearch.trim()) {
      toast.error('Please enter a product name to search');
      return;
    }
    if (customQuery !== null) {
      setOnlineQuery(customQuery);
    }
    setIsSearchingOnline(true);
    setHasSearchedOnline(true);
    try {
      const res = await api.get(`/products/online_search/?query=${encodeURIComponent(queryToSearch.trim())}`);
      const results = res.data.results || [];
      setOnlineResults(results);
      if (results.length === 0) {
        toast('No products found for this search term.', { icon: '🔍' });
      }
    } catch (err) {
      console.error('Online search error:', err);
      toast.error('Failed to query online grocery database.');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleImportOnlineProduct = (item) => {
    const matchedCatId = matchCategory(item.category_suggestion);
    openForm(null);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        name: item.name || '',
        brand: item.brand || '',
        unit: item.unit || '',
        sku: item.sku || '',
        description: item.description || '',
        image_url: item.image_url || '',
        category: matchedCatId || (categories[0]?.id || '')
      }));
    }, 100);
    setIsOnlineSearchOpen(false);
    toast.success(`Imported "${item.name}"! Fill price and stock to save.`);
  };

  const openForm = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name, category: product.category || '', brand: product.brand || '',
        description: product.description || '', unit: product.unit, regular_price: product.regular_price,
        offer_price: product.offer_price || '', is_active: product.is_active, is_in_stock: product.is_in_stock,
        stock_quantity: product.stock_quantity || 0, sku: product.sku || '', cost_price: product.cost_price || '',
        expiry_date: product.expiry_date || '', tags: product.tags || '',
        max_order_quantity: product.max_order_quantity || 10,
        image: product.image || null,
        image_url: typeof product.image === 'string' && product.image.startsWith('http') ? product.image : '',
        gallery_images: product.gallery_images || []
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', category: '', brand: '', description: '', unit: '', regular_price: '',
        offer_price: '', is_active: true, is_in_stock: true, stock_quantity: 0, sku: '', cost_price: '',
        expiry_date: '', tags: '', max_order_quantity: 10, image: null, image_url: '', gallery_images: [], imageBack: null
      });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGalleryCropQueue(files.slice(1));
    setActiveGalleryCropFile(files[0]);
    e.target.value = '';
  };

  const handleGalleryCropComplete = (croppedFile) => {
    setFormData(prev => ({
      ...prev,
      gallery_images: [...prev.gallery_images, croppedFile]
    }));
    if (galleryCropQueue.length > 0) {
      const nextFile = galleryCropQueue[0];
      setGalleryCropQueue(prev => prev.slice(1));
      setActiveGalleryCropFile(nextFile);
    } else {
      setActiveGalleryCropFile(null);
    }
  };

  const handleGalleryCropCancel = () => {
    if (galleryCropQueue.length > 0) {
      const nextFile = galleryCropQueue[0];
      setGalleryCropQueue(prev => prev.slice(1));
      setActiveGalleryCropFile(nextFile);
    } else {
      setActiveGalleryCropFile(null);
    }
  };

  const handleRemoveGalleryImage = async (index, imageObj) => {
    if (imageObj.id) {
      if (!window.confirm('Delete this image permanently?')) return;
      try {
        const res = await api.delete(`/products/${editingId}/delete_gallery_image/`, {
          data: { image_id: imageObj.id }
        });
        if (res.data.success) {
          toast.success('Image deleted');
        }
      } catch (err) {
        toast.error('Failed to delete image');
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    const toastId = toast.loading('Processing product...');

    try {
      if (formData.image instanceof File || formData.image instanceof Blob) {
        const compressedImg = await compressImage(formData.image);
        data.append('image', compressedImg, formData.image?.name || 'product.jpg');
      }

      Object.keys(formData).forEach(key => {
        if (key !== 'image' && key !== 'gallery_images' && formData[key] !== null && formData[key] !== '') {
          data.append(key, formData[key]);
        }
      });

      if (formData.gallery_images && formData.gallery_images.length > 0) {
        for (const file of formData.gallery_images) {
          if (file instanceof File || file instanceof Blob) {
            const compressedGalleryImg = await compressImage(file);
            data.append('gallery_images', compressedGalleryImg, file.name);
          }
        }
      }

      toast.loading('Saving product...', { id: toastId });
      const savePromise = editingId
        ? api.patch(`/products/${editingId}/`, data)
        : api.post('/products/', data);
      toast.promise(savePromise, {
        loading: formData.image instanceof File ? 'Uploading...' : 'Saving...',
        success: editingId ? 'Product updated!' : 'Product added!',
        error: 'Failed to save product. Check the inputs.'
      });
      await savePromise;
      closeForm();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}/`);
        toast.success('Product deleted');
        fetchData();
      } catch {
        toast.error('Failed to delete product.');
      }
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    if (searchTerm.trim()) return;
    const items = Array.from(products);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setProducts(items);
    const updates = items.map((item, index) => ({ id: item.id, display_order: index }));
    try {
      await api.post('/products/reorder/', updates);
      toast.success('Order updated', { position: 'bottom-right', id: 'reorder-toast-prod' });
    } catch {
      toast.error('Failed to save order');
      fetchData();
    }
  };

  const filteredProducts = products.filter(product => {
    if (selectedCategory !== 'all') {
      const matchCatId = product.category === selectedCategory;
      const matchCatName = categories.find(c => c.id === selectedCategory)?.name === product.category_name;
      if (!matchCatId && !matchCatName) return false;
    }
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
      (product.brand && product.brand.toLowerCase().includes(searchLower)) ||
      (product.category_name && product.category_name.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-[#2D1822] dark:text-[#FAF5EF] tracking-tight">Products</h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#F2E9E0] text-[#5E4752] border border-[#E7DBCF] dark:bg-[#3F2231] dark:text-[#EFDFD2] dark:border-white/10">
              {products.length}
            </span>
          </div>
          <p className="text-sm text-[#7D6671] dark:text-[#C5B0BA] mt-1">Manage inventory, pricing, barcodes, and global product catalog.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A68B98] w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] placeholder-[#A68B98] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm sm:w-64"
            />
          </div>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setIsScanning(true)} 
              className="flex items-center px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#EFDFD2] text-[#56323E] border border-[#E7DBCF] dark:bg-[#351D28] dark:hover:bg-[#3F2231] dark:text-[#FAF5EF] dark:border-white/10 font-medium rounded-lg transition-all shadow-sm whitespace-nowrap text-sm"
              title="Scan Barcode / SKU"
            >
              <ScanLine className="w-4 h-4 sm:mr-1.5"/><span className="hidden sm:inline">Scan</span>
            </button>
            <button 
              type="button"
              onClick={() => { setIsOnlineSearchOpen(true); }} 
              className="flex items-center px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#EFDFD2] text-[#56323E] border border-[#E7DBCF] dark:bg-[#351D28] dark:hover:bg-[#3F2231] dark:text-[#FAF5EF] dark:border-white/10 font-medium rounded-lg transition-all shadow-sm whitespace-nowrap text-sm"
              title="Search 3M+ Groceries Online"
            >
              <Globe className="w-4 h-4 sm:mr-1.5"/><span className="hidden sm:inline">Online Search</span>
            </button>
            <button 
              type="button"
              onClick={handleResetCatalog} 
              className="flex items-center px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#EFDFD2] text-[#56323E] border border-[#E7DBCF] dark:bg-[#351D28] dark:hover:bg-[#3F2231] dark:text-[#FAF5EF] dark:border-white/10 font-medium rounded-lg transition-all shadow-sm whitespace-nowrap text-sm"
              title="Reset and seed 100 authentic products across 12 categories"
            >
              <Sparkles className="w-4 h-4 sm:mr-1.5 text-amber-600 dark:text-amber-400"/><span className="hidden sm:inline">Seed 100 Items</span>
            </button>
            <button 
              type="button"
              onClick={() => openForm()} 
              className="flex items-center px-3 py-1.5 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#56323E] dark:hover:bg-[#432634] dark:text-[#FAF5EF] dark:border dark:border-white/10 font-bold rounded-lg transition-all shadow-sm whitespace-nowrap text-sm"
            >
              <Plus className="w-4 h-4 sm:mr-1.5"/><span className="hidden sm:inline">Add Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#56323E] text-[#FAF5EF] shadow-sm'
                : 'bg-white dark:bg-[#351D28] hover:bg-[#FAF5EF] dark:hover:bg-[#3F2231] text-[#5E4752] dark:text-[#EFDFD2] border border-[#E7DBCF] dark:border-white/10'
            }`}
          >
            All Products ({products.length})
          </button>
          {categories.map(c => {
            const count = products.filter(p => p.category === c.id || p.category_name === c.name).length;
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#56323E] text-[#FAF5EF] shadow-sm'
                    : 'bg-white dark:bg-[#351D28] hover:bg-[#FAF5EF] dark:hover:bg-[#3F2231] text-[#5E4752] dark:text-[#EFDFD2] border border-[#E7DBCF] dark:border-white/10'
                }`}
              >
                {c.image && (
                  <img src={c.image} alt="" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                )}
                <span>{c.name}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-[#FAF5EF] dark:bg-[#2D1822] text-[#7D6671] dark:text-[#C5B0BA]'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Online Grocery Search Modal */}
      {isOnlineSearchOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#56323E]/20 backdrop-blur-sm animate-fade-in">
          <div className="owner-theme bg-white dark:bg-[#351D28] rounded-2xl w-full max-w-3xl shadow-2xl border border-[#E7DBCF] dark:border-white/10 flex flex-col max-h-[85vh] overflow-hidden text-[#2D1822] dark:text-[#FAF5EF]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 md:px-6 md:py-4 border-b border-[#E7DBCF] dark:border-white/10 bg-[#FAF5EF] dark:bg-[#2D1822] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#56323E]/10 dark:bg-[#56323E]/40 flex items-center justify-center text-[#56323E] dark:text-[#FAF5EF]">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2D1822] dark:text-[#FAF5EF] font-editorial tracking-tight flex items-center gap-2">
                    Online Grocery Catalog
                    <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                      Open Food Facts Free API
                    </span>
                  </h2>
                  <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA]">Search over 3,000,000 grocery products with CDN images, weights, and descriptions</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOnlineSearchOpen(false)} 
                className="text-[#A68B98] hover:text-[#5E4752] dark:hover:text-[#FAF5EF] p-1.5 hover:bg-[#F2E9E0] dark:hover:bg-white/10 rounded-md transition-colors"
              >
                <X className="w-4 h-4"/>
              </button>
            </div>

            {/* Modal Search Bar & Suggestions */}
            <div className="p-4 md:px-6 border-b border-[#E7DBCF] dark:border-white/10 bg-white dark:bg-[#351D28] flex-shrink-0 space-y-3">
              <form onSubmit={handleOnlineSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A68B98] w-4 h-4" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search by name, brand, or barcode (e.g. Nutella, Amul Butter, Maggi)..."
                    value={onlineQuery}
                    onChange={(e) => setOnlineQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#FAF5EF] dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] placeholder-[#A68B98] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingOnline || !onlineQuery.trim()}
                  className="px-4 py-2 bg-[#56323E] hover:bg-[#432634] disabled:opacity-50 text-[#FAF5EF] font-medium rounded-lg text-sm transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {isSearchingOnline ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Search</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#A68B98] font-medium">Popular:</span>
                {QUICK_SEARCH_SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleOnlineSearch(null, tag)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-[#FAF5EF] dark:bg-[#3F2231] hover:bg-[#EFDFD2] dark:hover:bg-[#56323E] text-[#5E4752] dark:text-[#EFDFD2] border border-[#E7DBCF] dark:border-white/10 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Results List */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-3">
              {isSearchingOnline ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-[#56323E] animate-spin mb-3" />
                  <p className="text-sm font-medium text-[#2D1822] dark:text-[#FAF5EF]">Searching global grocery database...</p>
                  <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1">Checking Open Food Facts & Kirana open-source index</p>
                </div>
              ) : onlineResults.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-xs text-[#7D6671] dark:text-[#C5B0BA] px-1">
                    <span>Found {onlineResults.length} matching products</span>
                    <span>Click "Import" to populate your catalog form</span>
                  </div>
                  {onlineResults.map((item, idx) => (
                    <div
                      key={item.sku || idx}
                      className="p-3 bg-[#FAF5EF]/70 dark:bg-[#3F2231]/60 hover:bg-[#FAF5EF] dark:hover:bg-[#3F2231] border border-[#E7DBCF] dark:border-white/10 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-14 h-14 rounded-lg bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center p-1">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              loading="lazy"
                              className="w-full h-full object-contain"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-[#A68B98]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-[#2D1822] dark:text-[#FAF5EF] truncate">
                            {item.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                            {item.brand && (
                              <span className="px-2 py-0.5 rounded font-medium bg-[#F2E9E0] text-[#5E4752] dark:bg-[#56323E] dark:text-[#FAF5EF]">
                                {item.brand}
                              </span>
                            )}
                            {item.unit && (
                              <span className="px-2 py-0.5 rounded bg-white dark:bg-[#2D1822] text-[#5E4752] dark:text-[#EFDFD2] border border-[#E7DBCF] dark:border-white/10">
                                {item.unit}
                              </span>
                            )}
                            {item.category_suggestion && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                {item.category_suggestion}
                              </span>
                            )}
                            {item.sku && (
                              <span className="font-mono text-[11px] text-[#A68B98]">
                                Barcode: {item.sku}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA] line-clamp-1 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center justify-end sm:items-end flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleImportOnlineProduct(item)}
                          className="px-3.5 py-1.5 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] font-medium text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Import Product</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : hasSearchedOnline ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#FAF5EF] dark:bg-[#3F2231] border border-[#E7DBCF] dark:border-white/10 flex items-center justify-center mb-3">
                    <Search className="w-6 h-6 text-[#A68B98]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#2D1822] dark:text-[#FAF5EF]">No products found</h3>
                  <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1 max-w-sm">
                    We couldn't find items matching "{onlineQuery}". Try searching for a brand name, generic ingredient, or check your spelling.
                  </p>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#FAF5EF] dark:bg-[#3F2231] border border-[#E7DBCF] dark:border-white/10 flex items-center justify-center mb-3">
                    <Globe className="w-6 h-6 text-[#56323E] dark:text-[#FAF5EF]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#2D1822] dark:text-[#FAF5EF]">Search the Free Grocery Database</h3>
                  <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1 max-w-sm">
                    Type any item name or click one of the popular grocery items above to preview products, CDN pictures, and instant pre-filling.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:px-6 py-3 border-t border-[#E7DBCF] dark:border-white/10 bg-[#FAF5EF] dark:bg-[#2D1822] flex justify-between items-center flex-shrink-0 text-xs text-[#7D6671] dark:text-[#C5B0BA]">
              <span>Free & Unlimited Open Data (Open Food Facts)</span>
              <button 
                type="button" 
                onClick={() => setIsOnlineSearchOpen(false)} 
                className="px-3.5 py-1.5 text-xs font-medium text-[#5E4752] dark:text-[#EFDFD2] bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/10 rounded-lg hover:bg-[#FAF5EF] dark:hover:bg-[#3F2231] transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit Product Modal */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#56323E]/20 backdrop-blur-sm">
          <div className="owner-theme bg-white dark:bg-[#351D28] rounded-2xl w-full max-w-2xl shadow-2xl border border-[#E7DBCF] dark:border-white/10 flex flex-col max-h-[90vh] overflow-hidden text-[#2D1822] dark:text-[#FAF5EF]">
            <div className="flex justify-between items-center p-5 md:px-6 md:py-4 border-b border-[#E7DBCF] dark:border-white/10 bg-[#FAF5EF] dark:bg-[#2D1822] flex-shrink-0">
              <h2 className="text-lg font-bold text-[#2D1822] dark:text-[#FAF5EF] font-editorial tracking-tight">
                {editingId ? 'Edit Product' : 'New Product'}
              </h2>
              <button onClick={closeForm} className="text-[#A68B98] hover:text-[#5E4752] dark:hover:text-[#FAF5EF] p-1.5 hover:bg-[#F2E9E0] dark:hover:bg-white/10 rounded-md transition-colors">
                <X className="w-4 h-4"/>
              </button>
            </div>
            <div className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="productForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Name</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" 
                      placeholder="e.g. Aashirvaad Atta"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Category</label>
                    <select 
                      required 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Brand</label>
                    <input 
                      type="text" 
                      value={formData.brand} 
                      onChange={e => setFormData({...formData, brand: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" 
                      placeholder="e.g. ITC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Unit / Size</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.unit} 
                      onChange={e => setFormData({...formData, unit: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" 
                      placeholder="e.g. 1 kg, 500 g"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">MRP (₹)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formData.regular_price} 
                      onChange={e => setFormData({...formData, regular_price: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Special Price (₹)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={formData.offer_price} 
                      onChange={e => setFormData({...formData, offer_price: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" 
                      placeholder="Leave blank if no offer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Cost Price (₹)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={formData.cost_price} 
                      onChange={e => setFormData({...formData, cost_price: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" 
                      placeholder="Optional (For profit tracking)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Stock Quantity</label>
                    <input 
                      type="number" 
                      required 
                      value={formData.stock_quantity} 
                      onChange={e => setFormData({...formData, stock_quantity: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1 flex justify-between items-center">
                      <span>SKU / Barcode</span>
                      <button 
                        type="button" 
                        onClick={() => setShowScanner(!showScanner)} 
                        className="text-[#5E4752] dark:text-[#EFDFD2] hover:text-[#2D1822] text-xs flex items-center bg-[#F2E9E0] dark:bg-[#56323E] px-2 py-0.5 rounded border border-[#E7DBCF] dark:border-white/10"
                      >
                        <Camera size={12} className="mr-1" /> Scan
                      </button>
                    </label>
                    <input 
                      type="text" 
                      value={formData.sku} 
                      onChange={e => setFormData({...formData, sku: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" 
                      placeholder="Optional"
                    />
                    {showScanner && (
                      <Suspense fallback={null}>
                        <BarcodeScanner
                          onScan={(decodedText) => {
                            setFormData(prev => ({...prev, sku: decodedText}));
                            toast.success('Barcode scanned successfully!');
                            setShowScanner(false);
                          }}
                          onClose={() => setShowScanner(false)}
                        />
                      </Suspense>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Expiry Date</label>
                    <input 
                      type="date" 
                      value={formData.expiry_date} 
                      onChange={e => setFormData({...formData, expiry_date: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Tags (Comma Separated)</label>
                    <input 
                      type="text" 
                      value={formData.tags} 
                      onChange={e => setFormData({...formData, tags: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" 
                      placeholder="e.g. Bestseller, Organic"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Max Order Quantity</label>
                    <input 
                      type="number" 
                      value={formData.max_order_quantity} 
                      onChange={e => setFormData({...formData, max_order_quantity: e.target.value})} 
                      className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" 
                      placeholder="Limit per user"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Description</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" 
                    rows="2"
                    placeholder="Product details, ingredients, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">
                    Product Image <span className="text-[#A68B98] text-xs font-normal">(Square 1:1)</span>
                  </label>
                  <div className="border border-[#E7DBCF] dark:border-white/10 rounded-lg p-3 bg-[#FAF5EF] dark:bg-[#3F2231]">
                    <ImageCropper
                      aspect={1}
                      label="Upload Photo"
                      currentImageUrl={
                        formData.image && (formData.image instanceof File || formData.image instanceof Blob)
                          ? URL.createObjectURL(formData.image)
                          : typeof formData.image === 'string'
                            ? formData.image
                            : (formData.image_url || null)
                      }
                      onCropComplete={(file) => setFormData({...formData, image: file, image_url: ''})}
                    />
                    {formData.image_url && !formData.image && (
                      <div className="mt-2 text-xs text-[#7D6671] dark:text-[#C5B0BA] flex items-center justify-between bg-white dark:bg-[#2D1822] p-2 rounded border border-[#E7DBCF] dark:border-white/10">
                        <span className="truncate max-w-[280px]">Imported CDN: {formData.image_url}</span>
                        <button 
                          type="button" 
                          onClick={() => setFormData({...formData, image_url: ''})}
                          className="text-red-500 hover:text-red-700 text-xs font-medium ml-2"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2 mt-2">
                  <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-2">Gallery Images (Optional)</label>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                    {formData.gallery_images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#E7DBCF] dark:border-white/10 group">
                        <img 
                          src={img instanceof File || img instanceof Blob ? URL.createObjectURL(img) : (img.image || img)} 
                          className="w-full h-full object-cover" 
                          alt="Gallery item"
                        />
                        <button type="button" onClick={() => handleRemoveGalleryImage(idx, img)} className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3"/>
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-lg border border-dashed border-[#D9C6B8] hover:border-[#D9C6B8] bg-[#FAF5EF] hover:bg-[#F2E9E0] dark:bg-[#2D1822] dark:hover:bg-[#351D28] dark:border-white/20 transition-colors flex flex-col items-center justify-center cursor-pointer text-[#A68B98] hover:text-[#5E4752] dark:hover:text-[#FAF5EF]">
                      <Plus className="w-5 h-5 mb-1"/>
                      <span className="text-[10px] font-medium">Add Photos</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif,.svg" 
                        onChange={handleGalleryUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  {activeGalleryCropFile && (
                    <ImageCropper
                      file={activeGalleryCropFile}
                      aspect={1}
                      onCropComplete={handleGalleryCropComplete}
                      onCancel={handleGalleryCropCancel}
                    />
                  )}
                </div>

                <div className="flex items-center space-x-6 pt-2 md:col-span-2">
                  <div className="flex items-center">
                    <input type="checkbox" id="isActiveProd" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 text-[#56323E] rounded border-[#D9C6B8] focus:ring-[#56323E]"/>
                    <label htmlFor="isActiveProd" className="ml-2 text-sm text-[#5E4752] dark:text-[#EFDFD2] font-medium">Active (Visible)</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="inStock" checked={formData.is_in_stock} onChange={e => setFormData({...formData, is_in_stock: e.target.checked})} className="w-4 h-4 text-[#56323E] rounded border-[#D9C6B8] focus:ring-[#56323E]"/>
                    <label htmlFor="inStock" className="ml-2 text-sm text-[#5E4752] dark:text-[#EFDFD2] font-medium">In Stock</label>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 md:px-6 md:py-4 border-t border-[#E7DBCF] dark:border-white/10 bg-[#FAF5EF] dark:bg-[#2D1822] flex justify-end space-x-2 flex-shrink-0 rounded-b-xl">
              <button 
                type="button" 
                onClick={closeForm} 
                className="px-4 py-2 text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/10 rounded-lg hover:bg-[#FAF5EF] dark:hover:bg-[#3F2231] transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="productForm" 
                className="px-4 py-2 text-sm font-medium text-white bg-[#56323E] rounded-lg hover:bg-[#432634] transition-colors shadow-sm"
              >
                {editingId ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Products List */}
      {loading && products.length === 0 ? (
        <div className="bg-white dark:bg-[#351D28] rounded-xl shadow-sm border border-[#E7DBCF] dark:border-white/10 overflow-hidden divide-y divide-[#E7DBCF] dark:divide-white/10">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between animate-pulse">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-4 h-4 bg-[#F2E9E0] dark:bg-[#3F2231] rounded"></div>
                <div className="w-12 h-12 bg-[#F2E9E0] dark:bg-[#3F2231] rounded-lg flex-shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="w-32 h-4 bg-[#F2E9E0] dark:bg-[#3F2231] rounded"></div>
                  <div className="w-24 h-3 bg-[#F2E9E0] dark:bg-[#3F2231] rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="bg-white dark:bg-[#351D28] rounded-xl shadow-sm border border-[#E7DBCF] dark:border-white/10 overflow-hidden">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="products">
              {(provided) => (
                <div className="divide-y divide-[#E7DBCF] dark:divide-white/[0.08]" {...provided.droppableProps} ref={provided.innerRef}>
                  {filteredProducts.map((product, index) => (
                    <Draggable key={product.id} draggableId={product.id.toString()} index={index} isDragDisabled={Boolean(searchTerm.trim())}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-4 hover:bg-[#FAF5EF]/80 dark:hover:bg-white/[0.04] transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between group ${snapshot.isDragging ? 'bg-[#FAF5EF] dark:bg-[#3F2231] shadow-md ring-1 ring-[#E7DBCF] z-10' : ''}`}
                          style={provided.draggableProps.style}
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:text-[#5E4752] text-slate-300 dark:text-slate-600 transition-colors">
                              <GripVertical className="w-4 h-4"/>
                            </div>
                            <div className="w-12 h-12 flex-shrink-0 bg-white dark:bg-[#3F2231] rounded-lg overflow-hidden flex items-center justify-center border border-[#E7DBCF] dark:border-white/10 group-hover:border-[#D9C6B8] transition-colors">
                              {product.image ? (
                                <img 
                                  loading='lazy' 
                                  decoding='async' 
                                  src={product.name?.toLowerCase().includes('pumpkin') && (!product.image || product.image.includes('dummyimage.com')) ? '/media/products/pumpkin_seeds.jpg' : product.image} 
                                  alt={product.name} 
                                  onError={(e) => {
                                    if (product.name?.toLowerCase().includes('pumpkin') && !e.currentTarget.src.includes('pumpkin_seeds.jpg')) {
                                      e.currentTarget.src = '/media/products/pumpkin_seeds.jpg';
                                    }
                                  }}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-slate-300 dark:text-slate-500"/>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-sm font-semibold text-[#2D1822] dark:text-[#FAF5EF] truncate">{product.name}</h3>
                                {product.is_active ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active"></span>
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#D9C6B8]" title="Hidden"></span>
                                )}
                              </div>
                              <div className="text-xs text-[#7D6671] dark:text-[#C5B0BA] truncate flex items-center gap-1.5">
                                <span className="font-medium text-[#5E4752] dark:text-[#EFDFD2]">{product.category_name}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span>{product.unit} {product.brand && `• ${product.brand}`}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className={product.stock_quantity > 0 ? 'text-[#7D6671] dark:text-[#C5B0BA]' : 'text-red-500 font-medium'}>
                                  {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of Stock'}
                                </span>
                                {product.sku && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span className="font-mono text-[#A68B98]">SKU: {product.sku}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-64 flex-shrink-0 pt-2 sm:pt-0">
                            <div className="flex flex-col sm:items-end">
                              {product.offer_price ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-[#2D1822] dark:text-[#FAF5EF] tracking-tight">₹{product.offer_price}</span>
                                  <span className="text-xs text-[#A68B98] line-through">₹{product.regular_price}</span>
                                </div>
                              ) : (
                                <span className="text-sm font-semibold text-[#2D1822] dark:text-[#FAF5EF] tracking-tight">₹{product.regular_price}</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <button onClick={() => openForm(product)} className="p-1.5 text-[#A68B98] hover:text-[#2D1822] dark:hover:text-[#FAF5EF] rounded-md hover:bg-[#F2E9E0] dark:hover:bg-white/10 transition-colors inline-flex items-center">
                                <Edit2 className="w-4 h-4"/>
                              </button>
                              <button onClick={() => handleDelete(product.id)} className="p-1.5 text-[#A68B98] hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors inline-flex items-center">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-[#351D28] rounded-xl border border-dashed border-[#E7DBCF] dark:border-white/10">
          <div className="w-12 h-12 bg-[#FAF5EF] dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-xl flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-[#A68B98]"/>
          </div>
          <h3 className="text-sm font-semibold text-[#2D1822] dark:text-[#FAF5EF]">No products found</h3>
          <p className="text-sm text-[#7D6671] dark:text-[#C5B0BA] mt-1 mb-4">Get started by adding your first product to the catalog.</p>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsOnlineSearchOpen(true)} 
              className="flex items-center px-4 py-2 bg-[#FAF5EF] dark:bg-[#3F2231] text-[#56323E] dark:text-[#FAF5EF] border border-[#E7DBCF] dark:border-white/10 text-sm font-medium rounded-lg hover:bg-[#EFDFD2] dark:hover:bg-[#56323E] transition-colors shadow-sm"
            >
              <Globe className="w-4 h-4 mr-1.5"/>Search Online
            </button>
            <button 
              onClick={() => openForm()} 
              className="flex items-center px-4 py-2 bg-[#56323E] text-white text-sm font-medium rounded-lg hover:bg-[#432634] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5"/>Add Product
            </button>
          </div>
        </div>
      )}

      {isScanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScanning(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default Products;
