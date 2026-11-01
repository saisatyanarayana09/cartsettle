import { useState, useEffect, lazy, Suspense } from 'react';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Package, GripVertical, Camera, Sparkles, Wand2, FileText, ScanLine, Search } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';
import { createPortal } from 'react-dom';
import { compressImage } from '../../utils/compress';

const BarcodeScanner = lazy(() => import('../../components/BarcodeScanner'));
const Products = () => {
 const [products, setProducts] = useState([]);
 const [categories, setCategories] = useState([]);
 const [loading, setLoading] = useState(true);
 const [isScanning, setIsScanning] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [showScanner, setShowScanner] = useState(false);
 const [editingId, setEditingId] = useState(null);
 const [formData, setFormData] = useState({
 name: '', category: '', brand: '', description: '', unit: '',
 regular_price: '', offer_price: '', is_active: true, is_in_stock: true,
 stock_quantity: 0, sku: '', cost_price: '', expiry_date: '', tags: '',
 max_order_quantity: 10, image: null, gallery_images: [], imageBack: null
 });
 const [galleryCropQueue, setGalleryCropQueue] = useState([]);
 const [activeGalleryCropFile, setActiveGalleryCropFile] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFormOpen) {
        closeForm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen]);

 const fetchData = async () => {
 try {
 setLoading(true);
 const [prodRes, catRes] = await Promise.all([api.get('/products/'), api.get('/categories/')]);
 setProducts(prodRes.data.results || prodRes.data);
 setCategories(catRes.data.results || catRes.data);
 } catch { toast.error('Failed to load data.'); }
 finally { setLoading(false); }
 };

  useEffect(() => { fetchData(); }, []);

 const handleAIPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    toast.loading('AI is analyzing the product...', {id: 'ai-scan'});
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const res = await api.post('/products/vision_lookup/', formData);
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

 const handleBarcodeScan = async (decodedText) => {
    setIsScanning(false);
    toast.loading('Looking up product...', {id: 'scan-toast'});
    try {
        const res = await api.get(`/products/barcode_lookup/?barcode=${decodedText}`);
        toast.dismiss('scan-toast');
        if (res.data.source === 'local') {
            toast.success('Found in inventory! You can update stock.');
            openForm(res.data.product);
        } else if (res.data.source === 'external') {
            toast.success('Found product online! Auto-filling details...');
            openForm(null);
            setTimeout(() => {
              setFormData(prev => ({
                  ...prev,
                  name: res.data.product.name || '',
                  brand: res.data.product.brand || '',
                  unit: res.data.product.unit || '',
                  sku: res.data.product.sku || decodedText
              }));
            }, 100);
        } else {
            toast.error('Product not found. Please add manually.');
            openForm(null);
            setTimeout(() => setFormData(prev => ({ ...prev, sku: decodedText })), 100);
        }
    } catch (e) {
        toast.dismiss('scan-toast');
        toast.error('Error looking up barcode');
    }
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
 max_order_quantity: product.max_order_quantity || 10, image: product.image || null, gallery_images: product.gallery_images || []
 });
 } else {
 setEditingId(null);
 setFormData({ name: '', category: '', brand: '', description: '', unit: '', regular_price: '',
 offer_price: '', is_active: true, is_in_stock: true, stock_quantity: 0, sku: '', cost_price: '',
 expiry_date: '', tags: '', max_order_quantity: 10, image: null, gallery_images: [], imageBack: null });
 }
 setIsFormOpen(true);
 };




 const closeForm = () => { setIsFormOpen(false); setEditingId(null); };

 
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

 const toastId = toast.loading('Processing images...');

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

   toast.loading('Uploading...', { id: toastId });
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
 } catch (err) { console.error(err); }
 };

 const handleDelete = async (id) => {
 if (window.confirm('Are you sure you want to delete this product?')) {
 try {
 await api.delete(`/products/${id}/`);
 toast.success('Product deleted');
 fetchData();
 } catch { toast.error('Failed to delete product.'); }
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
 } catch { toast.error('Failed to save order'); fetchData(); }
 };

 const filteredProducts = products.filter(product => {
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
   <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
     <div>
       <div className="flex items-center gap-2.5">
         <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Products</h1>
         <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
           {products.length}
         </span>
       </div>
       <p className="text-sm text-slate-500 mt-1">Manage inventory, pricing, and product details.</p>
     </div>
     <div className="flex flex-col sm:flex-row gap-3">
       <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
         <input 
           type="text" 
           placeholder="Search products..." 
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm sm:w-64"
         />
       </div>
       <div className="flex gap-2">
         <button onClick={() => setIsScanning(true)} className="flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap text-sm">
           <ScanLine className="w-4 h-4 sm:mr-1.5"/><span className="hidden sm:inline">Scan</span>
         </button>
         <button onClick={() => openForm()} className="flex items-center px-3 py-1.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-all shadow-sm whitespace-nowrap text-sm">
           <Plus className="w-4 h-4 sm:mr-1.5"/><span className="hidden sm:inline">Add Product</span>
         </button>
       </div>
     </div>
   </div>

 {isFormOpen && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
 <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
 <div className="flex justify-between items-center p-5 md:px-6 md:py-4 border-b border-slate-200 flex-shrink-0">
 <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{editingId ? 'Edit Product' : 'New Product'}</h2>
 <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-md transition-colors">
 <X className="w-4 h-4"/>
 </button>
 </div>
 <div className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
 <form id="productForm" onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
 <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" placeholder="e.g. Aashirvaad Atta"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
 <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm">
 <option value="">Select Category</option>
 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
 <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" placeholder="e.g. ITC"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Unit / Size</label>
 <input type="text" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" placeholder="e.g. 1 kg, 500 g"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">MRP (₹)</label>
 <input type="number" step="0.01" required value={formData.regular_price} onChange={e => setFormData({...formData, regular_price: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Special Price (₹)</label>
 <input type="number" step="0.01" value={formData.offer_price} onChange={e => setFormData({...formData, offer_price: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" placeholder="Leave blank if no offer"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price (₹)</label>
 <input type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" placeholder="Optional (For profit tracking)"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity</label>
 <input type="number" required value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between items-center">
    <span>SKU / Barcode</span>
    <button type="button" onClick={() => setShowScanner(!showScanner)} className="text-slate-600 hover:text-slate-900 text-xs flex items-center bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
        <Camera size={12} className="mr-1" /> Scan
    </button>
 </label>
 <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" placeholder="Optional"/>
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
 <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
 <input type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Tags (Comma Separated)</label>
 <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" placeholder="e.g. Bestseller, Organic"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Max Order Quantity</label>
 <input type="number" value={formData.max_order_quantity} onChange={e => setFormData({...formData, max_order_quantity: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" placeholder="Limit per user"/>
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
 <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" rows="2"/>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Product Image <span className="text-slate-400 text-xs font-normal">(Square 1:1)</span></label>
 <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
 <ImageCropper
 aspect={1}
 label="Upload Photo"
 currentImageUrl={
 formData.image && (formData.image instanceof File || formData.image instanceof Blob)
 ? URL.createObjectURL(formData.image)
 : typeof formData.image === 'string' ? formData.image : null
 }
 onCropComplete={(file) => setFormData({...formData, image: file})}
 />
 </div>
 </div>
 
 <div className="md:col-span-2 mt-2">
    <label className="block text-sm font-medium text-slate-700 mb-2">Gallery Images (Optional)</label>
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
        {formData.gallery_images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
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
        <label className="aspect-square rounded-lg border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600">
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
 <input type="checkbox" id="isActiveProd" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"/>
 <label htmlFor="isActiveProd" className="ml-2 text-sm text-slate-700 font-medium">Active (Visible)</label>
 </div>
 <div className="flex items-center">
 <input type="checkbox" id="inStock" checked={formData.is_in_stock} onChange={e => setFormData({...formData, is_in_stock: e.target.checked})} className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"/>
 <label htmlFor="inStock" className="ml-2 text-sm text-slate-700 font-medium">In Stock</label>
 </div>
 </div>
 </form>
 </div>
 <div className="p-4 md:px-6 md:py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-2 flex-shrink-0 rounded-b-xl">
 <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
 <button type="submit" form="productForm" className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">{editingId ? 'Save Changes' : 'Add Product'}</button>
 </div>
 </div>
 </div>
 , document.body)}

 {/* Products List */}
 {loading && products.length === 0 ? (
   <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
     {[1, 2, 3, 4, 5].map(i => (
       <div key={i} className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between animate-pulse">
         <div className="flex items-center gap-4 flex-1">
           <div className="w-4 h-4 bg-slate-100 rounded"></div>
           <div className="w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0"></div>
           <div className="space-y-2 flex-1">
             <div className="w-32 h-4 bg-slate-100 rounded"></div>
             <div className="w-24 h-3 bg-slate-100 rounded"></div>
           </div>
         </div>
       </div>
     ))}
   </div>
 ) : filteredProducts.length > 0 ? (
 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
 <DragDropContext onDragEnd={onDragEnd}>
 <Droppable droppableId="products">
 {(provided) => (
 <div className="divide-y divide-slate-100" {...provided.droppableProps} ref={provided.innerRef}>
 {filteredProducts.map((product, index) => (
 <Draggable key={product.id} draggableId={product.id.toString()} index={index} isDragDisabled={Boolean(searchTerm.trim())}>
 {(provided, snapshot) => (
 <div
 ref={provided.innerRef}
 {...provided.draggableProps}
 className={`p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between group ${snapshot.isDragging ? 'bg-slate-50 shadow-md ring-1 ring-slate-200 z-10' : ''}`}
 style={provided.draggableProps.style}
 >
 <div className="flex items-center gap-4 min-w-0 flex-1">
 <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:text-slate-600 text-slate-300 transition-colors">
 <GripVertical className="w-4 h-4"/>
 </div>
 <div className="w-12 h-12 flex-shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 group-hover:border-slate-300 transition-colors">
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
 <ImageIcon className="w-5 h-5 text-slate-300"/>
 )}
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2 mb-0.5">
 <h3 className="text-sm font-semibold text-slate-900 truncate">{product.name}</h3>
 {product.is_active ? (
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active"></span>
 ) : (
    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" title="Hidden"></span>
 )}
 </div>
 <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
   <span className="font-medium text-slate-700">{product.category_name}</span>
   <span className="text-slate-300">•</span>
   <span>{product.unit} {product.brand && `• ${product.brand}`}</span>
   <span className="text-slate-300">•</span>
   <span className={product.stock_quantity > 0 ? 'text-slate-500' : 'text-red-500 font-medium'}>{product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of Stock'}</span>
   {product.sku && <>
    <span className="text-slate-300">•</span>
    <span className="font-mono text-slate-400">SKU: {product.sku}</span>
   </>}
 </div>
 </div>
 </div>
 <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-64 flex-shrink-0 pt-2 sm:pt-0">
 <div className="flex flex-col sm:items-end">
 {product.offer_price ? (
 <div className="flex items-center gap-1.5"><span className="text-sm font-semibold text-slate-900 tracking-tight">₹{product.offer_price}</span><span className="text-xs text-slate-400 line-through">₹{product.regular_price}</span></div>
 ) : (
 <span className="text-sm font-semibold text-slate-900 tracking-tight">₹{product.regular_price}</span>
 )}
 </div>
 <div className="flex items-center space-x-1">
 <button onClick={() => openForm(product)} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors inline-flex items-center">
 <Edit2 className="w-4 h-4"/>
 </button>
 <button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors inline-flex items-center">
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
 <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-200">
 <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-3">
 <Package className="w-6 h-6 text-slate-400"/>
 </div>
 <h3 className="text-sm font-semibold text-slate-900">No products found</h3>
 <p className="text-sm text-slate-500 mt-1 mb-4">Get started by adding your first product to the catalog.</p>
 <button onClick={() => openForm()} className="flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
 <Plus className="w-4 h-4 mr-1.5"/>Add Product
 </button>
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
