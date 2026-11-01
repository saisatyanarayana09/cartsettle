import { useEffect, useState } from 'react';
import { Tag, Image as ImageIcon, Plus, Trash2, GripVertical, X, MoreVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';
import { createPortal } from 'react-dom';

const Offers = () => {
  const [promos, setPromos] = useState([]);
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  
  const [promoForm, setPromoForm] = useState({ code: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '0', applicable_category: '', is_active: true });
  const [bannerForm, setBannerForm] = useState({ title: '', link: '', is_active: true });
  const [bannerFile, setBannerFile] = useState(null);

  useEffect(() => {
    fetchPromos();
    fetchBanners();
    fetchCategories();
  }, []);

  const fetchPromos = () => api.get('/offers/promocodes/').then(res => setPromos(res.data.results || res.data)).catch(console.error);
  const fetchBanners = () => api.get('/offers/banners/').then(res => setBanners(res.data.results || res.data)).catch(console.error);
  const fetchCategories = () => api.get('/categories/').then(res => setCategories(res.data.results || res.data)).catch(console.error);

  const handlePromoSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...promoForm };
      if (!payload.applicable_category) delete payload.applicable_category;
      await api.post('/offers/promocodes/', payload);
      setPromoForm({ code: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '0', applicable_category: '', is_active: true });
      setIsPromoModalOpen(false);
      fetchPromos();
      toast.success('Promo code created');
    } catch (err) {
      toast.error(err.response?.data?.code?.[0] || 'Error creating promo code');
    }
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    if (!bannerFile) return toast.error('Please select and crop an image');
    
    const formData = new FormData();
    formData.append('title', bannerForm.title);
    if (bannerForm.link) formData.append('link', bannerForm.link);
    formData.append('is_active', bannerForm.is_active);
    formData.append('image', bannerFile, bannerFile.name);

    const uploadPromise = api.post('/offers/banners/', formData);
    toast.promise(uploadPromise, {
      loading: 'Uploading banner...',
      success: 'Banner uploaded successfully',
      error: 'Error creating banner'
    });

    try {
      await uploadPromise;
      setBannerForm({ title: '', link: '', is_active: true });
      setBannerFile(null);
      setIsBannerModalOpen(false);
      fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };

  const deletePromo = async (id) => {
    if (!window.confirm('Delete this promo code?')) return;
    try {
      await api.delete(`/offers/promocodes/${id}/`);
      fetchPromos();
      toast.success('Promo code deleted');
    } catch {
      toast.error('Failed to delete promo code');
    }
  };

  const deleteBanner = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await api.delete(`/offers/banners/${id}/`);
      fetchBanners();
      toast.success('Banner deleted');
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(banners);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setBanners(items);
    const updates = items.map((item, index) => ({ id: item.id, display_order: index }));

    try {
      await api.post('/offers/banners/reorder/', updates);
      toast.success('Order saved', { id: 'reorder-toast-banner' });
    } catch {
      toast.error('Failed to save order');
      fetchBanners();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Marketing & Offers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage promotional banners and discount codes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPromoModalOpen(true)} className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 font-medium px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm">
            <Tag size={16} /> Promo Code
          </button>
          <button onClick={() => setIsBannerModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm">
            <Plus size={16} /> Banner
          </button>
        </div>
      </div>

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Storefront Banners</h2>
        </div>

        {banners.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="banners">
                {(provided) => (
                  <div className="divide-y divide-slate-100" {...provided.droppableProps} ref={provided.innerRef}>
                    {banners.map((banner, index) => (
                      <Draggable key={banner.id} draggableId={banner.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group ${snapshot.isDragging ? 'bg-slate-50 ring-1 ring-slate-200 z-10' : ''}`}
                            style={provided.draggableProps.style}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-slate-600 rounded-md">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="w-20 h-10 flex-shrink-0 bg-slate-100 rounded border border-slate-200 overflow-hidden">
                                {banner.image ? (
                                  <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 m-auto text-slate-300 mt-3" />
                                )}
                              </div>
                              <div className="min-w-0 ml-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-medium text-slate-900 truncate">{banner.title}</h3>
                                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${banner.is_active ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {banner.is_active ? 'Active' : 'Hidden'}
                                  </span>
                                </div>
                                {banner.link && (
                                  <div className="text-xs text-slate-500 truncate mt-0.5">{banner.link}</div>
                                )}
                              </div>
                            </div>
                            <button onClick={() => deleteBanner(banner.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors mr-2">
                              <Trash2 className="w-4 h-4"/>
                            </button>
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
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm">
            <h3 className="text-sm font-medium text-slate-900">No banners</h3>
            <p className="text-slate-500 text-sm mt-1">Upload landscape banners for your customers.</p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Active Promo Codes</h2>
        </div>

        {promos.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {promos.map(promo => (
              <div key={promo.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{promo.code}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${promo.is_active ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                        {promo.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span>{promo.discount_type === 'PERCENTAGE' ? `${promo.discount_value}% off` : `₹${promo.discount_value} off`}</span>
                      <span>•</span>
                      <span>Min ₹{promo.min_order_amount}</span>
                      {promo.applicable_category && (
                        <>
                          <span>•</span>
                          <span>{categories.find(c => c.id === promo.applicable_category)?.name || 'Specific Category'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => deletePromo(promo.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm">
            <h3 className="text-sm font-medium text-slate-900">No promo codes</h3>
            <p className="text-slate-500 text-sm mt-1">Create your first discount code.</p>
          </div>
        )}
      </section>

      {isPromoModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Add Promo Code</h2>
              <button onClick={() => setIsPromoModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={handlePromoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Code</label>
                  <input required value={promoForm.code} onChange={e => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})} className="w-full text-sm bg-white rounded-lg border border-slate-200 px-3 py-2 focus:ring-1 focus:ring-slate-900 outline-none transition-all uppercase" placeholder="WELCOME10"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                    <select value={promoForm.discount_type} onChange={e => setPromoForm({...promoForm, discount_type: e.target.value})} className="w-full text-sm bg-white rounded-lg border border-slate-200 px-3 py-2 focus:ring-1 focus:ring-slate-900 outline-none transition-all">
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FLAT">Flat (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Value</label>
                    <input required type="number" min="0" step="0.01" value={promoForm.discount_value} onChange={e => setPromoForm({...promoForm, discount_value: e.target.value})} className="w-full text-sm bg-white rounded-lg border border-slate-200 px-3 py-2 focus:ring-1 focus:ring-slate-900 outline-none transition-all"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Min Order (₹)</label>
                  <input required type="number" min="0" step="0.01" value={promoForm.min_order_amount} onChange={e => setPromoForm({...promoForm, min_order_amount: e.target.value})} className="w-full text-sm bg-white rounded-lg border border-slate-200 px-3 py-2 focus:ring-1 focus:ring-slate-900 outline-none transition-all"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category (Optional)</label>
                  <select value={promoForm.applicable_category} onChange={e => setPromoForm({...promoForm, applicable_category: e.target.value})} className="w-full text-sm bg-white rounded-lg border border-slate-200 px-3 py-2 focus:ring-1 focus:ring-slate-900 outline-none transition-all">
                    <option value="">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={promoForm.is_active} onChange={e => setPromoForm({...promoForm, is_active: e.target.checked})} className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"/>
                  <span className="text-sm text-slate-700">Active</span>
                </label>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsPromoModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}

      {isBannerModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Add Banner</h2>
              <button onClick={() => setIsBannerModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={handleBannerSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                  <input required value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} className="w-full text-sm bg-white rounded-lg border border-slate-200 px-3 py-2 focus:ring-1 focus:ring-slate-900 outline-none transition-all"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Link URL (Optional)</label>
                  <input type="url" value={bannerForm.link} onChange={e => setBannerForm({...bannerForm, link: e.target.value})} className="w-full text-sm bg-white rounded-lg border border-slate-200 px-3 py-2 focus:ring-1 focus:ring-slate-900 outline-none transition-all"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Image (3:1)</label>
                  <div className="border border-slate-200 rounded-lg p-1">
                    <ImageCropper onCropComplete={setBannerFile} aspect={3} />
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={bannerForm.is_active} onChange={e => setBannerForm({...bannerForm, is_active: e.target.checked})} className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"/>
                  <span className="text-sm text-slate-700">Active</span>
                </label>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsBannerModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">Upload</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
};

export default Offers;
