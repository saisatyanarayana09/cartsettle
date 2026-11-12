import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, Check, X, GripVertical, Search, Sparkles, Image as ImageIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';

const CATEGORY_PRESETS = [
  { name: 'Dairy & Eggs', image: '/categories/c1.jpg' },
  { name: 'Atta, Flours & Grains', image: '/categories/c2.jpg' },
  { name: 'Rice & Pulses', image: '/categories/c3.jpg' },
  { name: 'Edible Oils & Ghee', image: '/categories/c4.jpg' },
  { name: 'Instant Food & Noodles', image: '/categories/c5.jpg' },
  { name: 'Snacks, Biscuits & Namkeen', image: '/categories/c6.jpg' },
  { name: 'Beverages, Tea & Coffee', image: '/categories/c7.jpg' },
  { name: 'Spices & Seasonings', image: '/categories/c8.jpg' },
  { name: 'Chocolates, Honey & Spreads', image: '/categories/c9.jpg' },
  { name: 'Household & Cleaning', image: '/categories/c10.jpg' },
  { name: 'Personal Care & Hygiene', image: '/categories/c11.jpg' },
  { name: 'Packaged Essentials & Sugar', image: '/categories/c12.jpg' },
];

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', is_active: true });
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories/');
      setCategories(response.data.results || response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch categories.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openForm = (category = null) => {
    if (category) {
      setEditingId(category.id);
      setFormData({ name: category.name, is_active: category.is_active });
      setImageUrl(typeof category.image === 'string' ? category.image : '');
    } else {
      setEditingId(null);
      setFormData({ name: '', is_active: true });
      setImageUrl('');
    }
    setImageFile(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({ name: '', is_active: true });
    setImageFile(null);
    setImageUrl('');
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({ ...prev, name: preset.name }));
    setImageUrl(preset.image);
    setImageFile(null);
    toast.success(`Applied ${preset.name} preset!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('is_active', formData.is_active);
      if (imageFile) {
        payload.append('image', imageFile, imageFile.name);
      } else if (imageUrl) {
        payload.append('image_url', imageUrl);
      }
 
      const savePromise = editingId 
        ? api.patch(`/categories/${editingId}/`, payload)
        : api.post('/categories/', payload);

      toast.promise(savePromise, {
        loading: imageFile ? 'Uploading...' : 'Saving...',
        success: editingId ? 'Category updated!' : 'Category created!',
        error: 'Failed to save category. Ensure name is unique.'
      });

      await savePromise;
      closeForm();
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await api.delete(`/categories/${id}/`);
        toast.success('Category deleted');
        fetchCategories();
      } catch (err) {
        toast.error('Failed to delete category. It might be linked to products.');
        console.error(err);
      }
    }
  };

  const handleResetCatalog = async () => {
    if (!window.confirm('Reset and seed 12 standard Kirana categories with 100 products?')) return;
    const toastId = toast.loading('Seeding standard catalog...');
    try {
      const res = await api.post('/categories/reset_and_seed_catalog/');
      toast.success(res.data.message || 'Catalog seeded successfully!', { id: toastId });
      fetchCategories();
    } catch (err) {
      toast.error('Failed to seed catalog: ' + (err.response?.data?.error || err.message), { id: toastId });
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCategories(items);

    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index
    }));

    try {
      await api.post('/categories/reorder/', updates);
      toast.success('Order updated instantly', { position: 'bottom-right', id: 'reorder-toast' });
    } catch (error) {
      toast.error('Failed to save order');
      fetchCategories();
    }
  };

  const filteredCategories = categories.filter(c =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && categories.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-sm text-[#7D6671] dark:text-[#C5B0BA] font-medium">
        Loading categories...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-[#2D1822] dark:text-[#FAF5EF] tracking-tight">Categories</h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#F2E9E0] text-[#5E4752] border border-[#E7DBCF] dark:bg-[#3F2231] dark:text-[#EFDFD2] dark:border-white/10">
              {categories.length}
            </span>
          </div>
          <p className="text-sm text-[#7D6671] dark:text-[#C5B0BA] mt-1">Organize your store catalog with high-resolution imagery and drag-and-drop order.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A68B98] w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-sm text-[#2D1822] dark:text-[#FAF5EF] placeholder-[#A68B98] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"
            />
          </div>

          <button 
            type="button"
            onClick={handleResetCatalog}
            className="flex items-center px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#EFDFD2] text-[#56323E] border border-[#E7DBCF] dark:bg-[#351D28] dark:hover:bg-[#3F2231] dark:text-[#FAF5EF] dark:border-white/10 rounded-lg text-sm font-medium transition-all shadow-sm whitespace-nowrap"
            title="Reset and seed 12 standard categories with 100 products"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-amber-600 dark:text-amber-400" />
            Seed Standard 12
          </button>

          <button 
            type="button"
            onClick={() => openForm()}
            className="flex items-center px-3 py-1.5 bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#56323E] dark:hover:bg-[#432634] dark:text-[#FAF5EF] dark:border dark:border-white/10 rounded-lg text-sm font-medium transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5"/>
            Add Category
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">{error}</div>}

      {/* Modal Dialog */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#56323E]/20 backdrop-blur-sm">
          <div className="owner-theme bg-white dark:bg-[#351D28] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-[#E7DBCF] dark:border-white/10 text-[#2D1822] dark:text-[#FAF5EF] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#E7DBCF] dark:border-white/10">
              <h2 className="text-lg font-semibold text-[#2D1822] dark:text-[#FAF5EF] tracking-tight">{editingId ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={closeForm} className="text-[#A68B98] hover:text-[#5E4752] dark:hover:text-[#FAF5EF] transition-colors p-1 hover:bg-[#F2E9E0] dark:hover:bg-white/10 rounded-md">
                <X className="w-4 h-4"/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="cat-name" className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Name</label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 rounded-lg text-[#2D1822] dark:text-[#FAF5EF] focus:outline-none focus:border-[#D9C6B8] focus:ring-1 focus:ring-slate-400 transition-all text-sm shadow-sm"
                  placeholder="e.g. Atta, Flours & Grains"
                />
              </div>

              {/* 1-Click Presets */}
              <div>
                <label className="block text-xs font-medium text-[#7D6671] dark:text-[#C5B0BA] mb-1.5 flex items-center justify-between">
                  <span>Quick Presets (Name & Photo)</span>
                  <span className="text-[10px] text-[#A68B98]">Click to apply</span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#FAF5EF] dark:bg-[#2D1822] rounded-lg border border-[#E7DBCF] dark:border-white/10">
                  {CATEGORY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-[#3F2231] hover:bg-[#EFDFD2] dark:hover:bg-[#56323E] text-[#5E4752] dark:text-[#EFDFD2] border border-[#E7DBCF] dark:border-white/10 transition-colors flex items-center gap-1"
                    >
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2] mb-1">Category Image</label>
                <div className="border border-[#E7DBCF] dark:border-white/10 rounded-lg p-3 bg-[#FAF5EF] dark:bg-[#3F2231]">
                  <ImageCropper 
                    aspect={1}
                    label="Upload Photo"
                    currentImageUrl={
                      imageFile && (imageFile instanceof File || imageFile instanceof Blob) 
                        ? URL.createObjectURL(imageFile) 
                        : imageUrl || (editingId && categories.find(c => c.id === editingId)?.image) || null
                    }
                    onCropComplete={(file) => {
                      setImageFile(file);
                      setImageUrl('');
                    }}
                  />
                  {imageUrl && !imageFile && (
                    <div className="mt-2 text-xs text-[#7D6671] dark:text-[#C5B0BA] flex items-center justify-between bg-white dark:bg-[#2D1822] p-2 rounded border border-[#E7DBCF] dark:border-white/10">
                      <span className="truncate max-w-[260px]">Preset: {imageUrl}</span>
                      <button 
                        type="button" 
                        onClick={() => setImageUrl('')}
                        className="text-red-500 hover:text-red-700 text-xs font-medium ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[#7D6671] dark:text-[#C5B0BA] mt-1.5">Square 1:1 image displayed on customer app and website navigation tabs.</p>
              </div>
              
              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 text-[#56323E] rounded border-[#D9C6B8] focus:ring-[#56323E]"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-[#5E4752] dark:text-[#EFDFD2]">
                  Active (visible to customers)
                </label>
              </div>

              <div className="pt-4 border-t border-[#E7DBCF] dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-[#5E4752] dark:text-[#EFDFD2] font-medium bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/10 rounded-lg hover:bg-[#FAF5EF] dark:hover:bg-[#3F2231] transition-colors text-sm shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white font-medium bg-[#56323E] rounded-lg hover:bg-[#432634] transition-colors shadow-sm text-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Categories Table */}
      <div className="bg-white dark:bg-[#351D28] rounded-xl shadow-sm border border-[#E7DBCF] dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E7DBCF] dark:divide-white/10">
            <thead className="bg-[#FAF5EF] dark:bg-[#2D1822] border-b border-[#E7DBCF] dark:border-white/10">
              <tr>
                <th scope="col" className="px-4 py-3 w-10"><span className="sr-only">Reorder</span></th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-[#7D6671] dark:text-[#C5B0BA] tracking-tight">Category</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-[#7D6671] dark:text-[#C5B0BA] tracking-tight">Status</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-[#7D6671] dark:text-[#C5B0BA] tracking-tight">Actions</th>
              </tr>
            </thead>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="categories">
                {(provided) => (
                  <tbody 
                    className="bg-white dark:bg-[#351D28] divide-y divide-[#E7DBCF] dark:divide-white/[0.08]"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {filteredCategories.map((category, index) => (
                      <Draggable key={category.id} draggableId={category.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`hover:bg-[#FAF5EF]/80 dark:hover:bg-white/[0.04] transition-colors group ${snapshot.isDragging ? 'bg-[#FAF5EF] dark:bg-[#3F2231] shadow-md ring-1 ring-[#E7DBCF] z-10' : ''}`}
                            style={provided.draggableProps.style}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-[#A68B98] w-10">
                              <div {...provided.dragHandleProps} aria-label={`Reorder ${category.name}`} className="cursor-grab active:cursor-grabbing p-1 rounded hover:text-[#5E4752] dark:hover:text-[#FAF5EF] transition-colors">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#FAF5EF] dark:bg-[#2D1822] border border-[#E7DBCF] dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                  {category.image ? (
                                    <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[#A68B98] font-medium text-xs">{category.name?.charAt(0)}</span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-[#2D1822] dark:text-[#FAF5EF]">
                                    {category.name}
                                  </div>
                                  <div className="text-xs text-[#7D6671] dark:text-[#C5B0BA]">
                                    Order #{category.display_order ?? index + 1}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 inline-flex text-xs font-medium rounded-md ${
                                category.is_active 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40' 
                                  : 'bg-[#F2E9E0] dark:bg-[#3F2231] text-[#5E4752] dark:text-[#EFDFD2] border border-[#E7DBCF] dark:border-white/10'
                              }`}>
                                {category.is_active ? 'Active' : 'Hidden'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-1">
                              <button 
                                onClick={() => openForm(category)}
                                aria-label={`Edit ${category.name}`}
                                className="p-1.5 text-[#A68B98] hover:text-[#2D1822] dark:hover:text-[#FAF5EF] rounded-md hover:bg-[#F2E9E0] dark:hover:bg-white/10 transition-colors inline-flex items-center"
                              >
                                <Edit2 className="w-4 h-4"/>
                              </button>
                              <button 
                                onClick={() => handleDelete(category.id)}
                                aria-label={`Delete ${category.name}`}
                                className="p-1.5 text-[#A68B98] hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors inline-flex items-center"
                              >
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                  </tbody>
                )}
              </Droppable>
            </DragDropContext>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Categories;
