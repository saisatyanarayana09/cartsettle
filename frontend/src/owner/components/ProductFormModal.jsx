import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import BarcodeScanner from '../../components/BarcodeScanner';
import api from '../../services/api';
import ImageCropper from './ImageCropper';
import { compressImage } from '../../utils/compress';

const ProductFormModal = ({ isOpen, onClose, editingProduct = null, categories: initialCategories = [], onSaveSuccess }) => {
  const [editingId, setEditingId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [formData, setFormData] = useState({
    name: '', category: '', brand: '', description: '', unit: '',
    regular_price: '', offer_price: '', is_active: true, is_in_stock: true,
    stock_quantity: 0, sku: '', cost_price: '', expiry_date: '', tags: '',
    max_order_quantity: 10, image: null, gallery_images: [], imageBack: null
  });
  const [galleryCropQueue, setGalleryCropQueue] = useState([]);
  const [activeGalleryCropFile, setActiveGalleryCropFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setEditingId(editingProduct.id);
        setFormData({
          name: editingProduct.name, category: editingProduct.category || '', brand: editingProduct.brand || '',
          description: editingProduct.description || '', unit: editingProduct.unit, regular_price: editingProduct.regular_price,
          offer_price: editingProduct.offer_price || '', is_active: editingProduct.is_active, is_in_stock: editingProduct.is_in_stock,
          stock_quantity: editingProduct.stock_quantity || 0, sku: editingProduct.sku || '', cost_price: editingProduct.cost_price || '',
          expiry_date: editingProduct.expiry_date || '', tags: editingProduct.tags || '',
          max_order_quantity: editingProduct.max_order_quantity || 10, image: editingProduct.image || null, gallery_images: editingProduct.gallery_images || []
        });
      } else {
        setEditingId(null);
        setFormData({
          name: '', category: '', brand: '', description: '', unit: '', regular_price: '',
          offer_price: '', is_active: true, is_in_stock: true, stock_quantity: 0, sku: '', cost_price: '',
          expiry_date: '', tags: '', max_order_quantity: 10, image: null, gallery_images: [], imageBack: null
        });
      }

      if (categories.length === 0) {
        api.get('/categories/').then(res => {
          setCategories(res.data.results || res.data);
        }).catch(err => console.error("Failed to fetch categories", err));
      }
    }
  }, [isOpen, editingProduct]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    if (imageObj.id && editingId) {
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
      onSaveSuccess();
      onClose();
    } catch (err) { 
      console.error(err); 
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 md:px-6 md:py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{editingId ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" aria-label="Close modal">
            <X className="w-5 h-5"/>
          </button>
        </div>
        <div className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="productFormModal" onSubmit={handleSubmit} className="space-y-4">
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
                  <button type="button" onClick={() => setShowScanner(!showScanner)} className="text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 min-h-[32px] rounded-md border border-slate-200 cursor-pointer transition-colors" aria-label="Scan barcode">
                    <Camera size={13} className="mr-0.5" /> Scan
                  </button>
                </label>
                <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm" placeholder="Optional"/>
                {showScanner && (
                  <BarcodeScanner
                    onScan={(decodedText) => {
                      setFormData(prev => ({...prev, sku: decodedText}));
                      toast.success('Barcode scanned successfully!');
                      setShowScanner(false);
                    }}
                    onClose={() => setShowScanner(false)}
                  />
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
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(idx, img)}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 p-1 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center bg-red-600/90 hover:bg-red-700 text-white rounded-md opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                    >
                      <X className="w-3.5 h-3.5"/>
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
                <input type="checkbox" id="isActiveProdModal" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"/>
                <label htmlFor="isActiveProdModal" className="ml-2 text-sm text-slate-700 font-medium">Active (Visible)</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="inStockModal" checked={formData.is_in_stock} onChange={e => setFormData({...formData, is_in_stock: e.target.checked})} className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"/>
                <label htmlFor="inStockModal" className="ml-2 text-sm text-slate-700 font-medium">In Stock</label>
              </div>
            </div>
          </form>
        </div>
        <div className="p-4 md:px-6 md:py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-2 flex-shrink-0 rounded-b-xl">
          <button type="button" onClick={onClose} className="px-4 py-2.5 min-h-[40px] sm:min-h-[44px] text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">Cancel</button>
          <button type="submit" form="productFormModal" className="px-4 py-2.5 min-h-[40px] sm:min-h-[44px] text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm cursor-pointer">{editingId ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </div>
    </div>
  , document.body);
};

export default ProductFormModal;
