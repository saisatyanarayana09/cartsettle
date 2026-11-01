import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Layout, Loader2, Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import HomepageSectionEditor, { stripEmojis } from '../components/HomepageSectionEditor';
import MidPageBannerEditor from '../components/MidPageBannerEditor';
import ImageCropper from '../components/ImageCropper';
import { createPortal } from 'react-dom';

export default function Showcase() {
  const [sections, setSections] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bannerCropFile, setBannerCropFile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [savingBanners, setSavingBanners] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);

  const [renamingSection, setRenamingSection] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');

  const loadData = async () => {
    try {
      const [secRes, prodRes, banRes, setRes] = await Promise.all([
        api.get('/store/homepage-sections/'),
        api.get('/products/'),
        api.get('/offers/banners/'),
        api.get('/store/settings/')
      ]);
      const mappedSections = secRes.data.map(sec => ({
          ...sec,
          title: stripEmojis(sec.title),
          items: (sec.section_products || []).sort((a, b) => a.position - b.position).map(sp => sp.product_details)
        }));
        setSections(mappedSections.sort((a, b) => a.display_order - b.display_order));
      const pList = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.results ?? []);
      setAllProducts(pList);
      setBanners(banRes.data.results || banRes.data || []);
      setSettings(setRes.data);
    } catch {
      toast.error('Failed to load showcase data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  const handleSelectBannerFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerCropFile(file);
    e.target.value = '';
  };

  const handleCropBannerComplete = async (croppedBlob) => {
    const originalName = bannerCropFile?.name || 'Banner';
    setBannerCropFile(null);
    if (!croppedBlob) return;

    const formData = new FormData();
    formData.append('image', croppedBlob, croppedBlob.name || 'banner.jpg');
    formData.append('title', originalName.replace(/\.[^/.]+$/, "") || 'Banner');
    formData.append('display_order', banners.length);
    formData.append('is_active', true);
    
    const loadingToast = toast.loading('Uploading banner...');
    try {
      const res = await api.post('/offers/banners/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBanners(prev => [...prev, res.data]);
      toast.success('Banner added successfully!', { id: loadingToast });
    } catch {
      toast.error('Failed to upload banner.', { id: loadingToast });
    }
  };
  
  const handleDeleteBanner = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      await api.delete(`/offers/banners/${id}/`);
      setBanners(banners.filter(a => a.id !== id));
      toast.success('Banner deleted');
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  const handleToggleBanner = async (id, currentStatus) => {
    try {
      const res = await api.patch(`/offers/banners/${id}/`, { is_active: !currentStatus });
      setBanners(banners.map(a => a.id === id ? res.data : a));
    } catch {
      toast.error('Failed to toggle banner');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, type } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'banner') {
      const updated = Array.from(banners);
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved);
      const newlyOrdered = updated.map((ann, idx) => ({ ...ann, display_order: idx }));
      setBanners(newlyOrdered);
      setSavingBanners(true);
      try {
        await api.post('/offers/banners/reorder/', newlyOrdered.map(a => ({ id: a.id, display_order: a.display_order })));
      } catch {
        toast.error('Failed to save banner order.');
        loadData();
      } finally {
        setSavingBanners(false);
      }
      return;
    }

    if (type === 'section') {
      const updated = Array.from(sections);
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved);
      
      const newlyOrdered = updated.map((sec, idx) => ({ ...sec, display_order: idx }));
      setSections(newlyOrdered);
      setSavingOrder(true);
      try {
        await api.post('/store/homepage-sections/reorder/', newlyOrdered.map(s => ({ id: s.id, display_order: s.display_order })));
        toast.success('Showcase layout saved', { id: 'save-layout-toast' });
      } catch {
        toast.error('Failed to save layout');
        loadData();
      } finally {
        setSavingOrder(false);
      }
    } else if (type === 'product') {
      const sectionIdStr = source.droppableId.replace('products-', '');
      const sectionId = parseInt(sectionIdStr, 10);
      const sectionIndex = sections.findIndex(s => s.id === sectionId);
      if (sectionIndex === -1) return;

      const sec = sections[sectionIndex];
      const updatedItems = Array.from(sec.items || []);
      const [movedItem] = updatedItems.splice(source.index, 1);
      updatedItems.splice(destination.index, 0, movedItem);
      updatedItems.forEach((item, idx) => { item.position = idx; });

      const newSections = [...sections];
      newSections[sectionIndex] = { ...sec, items: updatedItems };
      setSections(newSections);

      try {
        await api.patch(`/store/homepage-sections/${sectionId}/`, {
          product_ids: updatedItems.map(i => i.id)
        });
      } catch {
        toast.error('Failed to save product order.');
      }
    }
  };

  const handleUpdateItems = (sectionId, newItems) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, items: newItems || [] } : s));
  };

  const handleSaveSection = async (sectionId, items) => {
    try {
      await api.patch(`/store/homepage-sections/${sectionId}/`, {
        product_ids: (items || []).map(i => i.id)
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleAddSection = async () => {
    const rawTitle = window.prompt("Enter new section title:");
    if (!rawTitle) return;
    const title = stripEmojis(rawTitle);
    if (!title) {
      toast.error("Please enter a valid title");
      return;
    }
    try {
      const res = await api.post('/store/homepage-sections/', { title, display_order: sections.length, is_active: true });
      setSections([...sections, { ...res.data, title: stripEmojis(res.data.title), items: [] }]);
      toast.success('Section created');
    } catch {
      toast.error('Failed to create section');
    }
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm("Delete this section?")) return;
    try {
      await api.delete(`/store/homepage-sections/${id}/`);
      setSections(sections.filter(s => s.id !== id));
      toast.success('Section deleted');
    } catch {
      toast.error('Failed to delete section');
    }
  };

  const submitRename = async () => {
    if (!renameTitle || !renamingSection) return;
    const title = stripEmojis(renameTitle);
    if (!title) {
      toast.error("Please enter a valid title");
      return;
    }
    try {
      const res = await api.patch(`/store/homepage-sections/${renamingSection.id}/`, { title });
      setSections(sections.map(s => s.id === renamingSection.id ? { ...s, title: stripEmojis(res.data.title) } : s));
      toast.success('Section renamed');
      setRenamingSection(null);
    } catch {
      toast.error('Failed to rename section');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm font-medium">Loading showcase…</span>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Storefront Showcase</h1>
            <p className="text-sm text-slate-500 mt-1">
              Curate the sections shown on the customer homepage. Drag to reorder.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savingOrder && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </div>
            )}
            <button onClick={handleAddSection} className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition text-sm shadow-sm">
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          </div>
        </div>

        {/* Promotional Banners */}
        <section>
          <div className="mb-3 flex justify-between items-end">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Promotional Banners</h2>
              <p className="text-xs text-slate-500 mt-0.5">Main carousel images.</p>
            </div>
            <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors text-xs shadow-sm cursor-pointer">
              <Plus size={14} /> Upload Banner
              <input type="file" accept="image/*" className="hidden" onChange={handleSelectBannerFile} />
            </label>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            <Droppable droppableId="banners-list" type="banner">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {banners.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">No promotional banners yet.</div>
                  ) : (
                    banners.map((ann, index) => (
                      <Draggable key={`ban-${ann.id}`} draggableId={`ban-${ann.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 flex items-center justify-between group hover:bg-slate-50 transition-colors ${snapshot.isDragging ? 'bg-slate-50 ring-1 ring-slate-200 z-50' : ''}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div {...provided.dragHandleProps} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-grab active:cursor-grabbing">
                                <GripVertical size={16} />
                              </div>
                              <div className="w-20 h-10 bg-slate-100 rounded overflow-hidden flex-shrink-0 border border-slate-200">
                                {ann.image && <img src={ann.image} className="w-full h-full object-cover" alt="Banner" />}
                              </div>
                              <div className="text-sm font-medium text-slate-900 truncate px-2">
                                {ann.title || 'Banner'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mr-2">
                              <button onClick={() => handleToggleBanner(ann.id, ann.is_active)} className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${ann.is_active ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                                {ann.is_active ? 'Active' : 'Hidden'}
                              </button>
                              <button onClick={() => handleDeleteBanner(ann.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            {bannerCropFile && (
              <div className="p-4 border-t border-slate-100">
                <ImageCropper
                  file={bannerCropFile}
                  aspectRatio={3}
                  onCropComplete={handleCropBannerComplete}
                  onCancel={() => setBannerCropFile(null)}
                />
              </div>
            )}
          </div>
        </section>

        {/* Sections */}
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Showcase Sections</h2>
          </div>

          <Droppable droppableId="homepage-sections" type="section">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {sections.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-sm text-slate-500 mb-3">No showcase sections yet.</p>
                    <button onClick={handleAddSection} className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 text-sm transition-colors">
                      Create Section
                    </button>
                  </div>
                )}
                {sections.map((section, index) => (
                  <Draggable key={`section-${section.id}`} draggableId={`section-${section.id}`} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-white rounded-xl border transition-all overflow-hidden ${
                          snapshot.isDragging
                            ? 'shadow-lg ring-1 ring-slate-300 border-transparent'
                            : 'border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {stripEmojis(section.title)}
                            </span>
                            <button onClick={() => { setRenamingSection(section); setRenameTitle(stripEmojis(section.title)); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                              #{index + 1}
                            </span>
                            <button onClick={() => handleDeleteSection(section.id)} className="text-slate-400 hover:text-rose-600 p-1 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4">
                          {section.section_type === 'banner' ? (
                            <MidPageBannerEditor 
                              section={section}
                              onUpdateSection={(updated) => setSections(prev => prev.map(s => s.id === updated.id ? updated : s))}
                            />
                          ) : (
                            <HomepageSectionEditor
                              section={section}
                              allProducts={allProducts}
                              onUpdateItems={handleUpdateItems}
                              onSave={handleSaveSection}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </section>

        {renamingSection && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-slate-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Rename Section</h3>
                <button onClick={() => setRenamingSection(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4"/></button>
              </div>
              <input 
                autoFocus
                type="text" 
                value={renameTitle} 
                onChange={e => setRenameTitle(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && submitRename()}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 outline-none mb-4" 
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setRenamingSection(null)} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">Cancel</button>
                <button onClick={submitRename} className="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors">Save</button>
              </div>
            </div>
          </div>
        , document.body)}
      </div>
    </DragDropContext>
  );
}
