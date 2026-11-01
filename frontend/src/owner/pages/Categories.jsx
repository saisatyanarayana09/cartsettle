import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, Check, X, GripVertical, Search } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';

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

 const fetchCategories = async () => {
 try {
 setLoading(true);
 const response = await api.get('/categories/');
 // Assuming DRF pagination is active, data might be in response.data.results
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
 } else {
 setEditingId(null);
 setFormData({ name: '', is_active: true });
 }
 setImageFile(null);
 setIsFormOpen(true);
 };

 const closeForm = () => {
 setIsFormOpen(false);
 setEditingId(null);
 setFormData({ name: '', is_active: true });
 setImageFile(null);
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 const payload = new FormData();
 payload.append('name', formData.name);
 payload.append('is_active', formData.is_active);
      if (imageFile) {
        payload.append('image', imageFile, imageFile.name);
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
      <div className="max-w-5xl mx-auto py-12 text-center text-sm text-slate-500 font-medium">
        Loading categories...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Categories</h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {categories.length}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Organize your store catalog sections</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm"
            />
          </div>

          <button 
            onClick={() => openForm()}
            className="flex items-center px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5"/>
            Add Category
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">{error}</div>}

      {isFormOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{editingId ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-md">
                <X className="w-4 h-4"/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="cat-name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all text-sm shadow-sm"
                  placeholder="e.g. Rice & Grains"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category Image</label>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <ImageCropper 
                    aspect={1}
                    label="Upload Photo"
                    currentImageUrl={
                      imageFile && (imageFile instanceof File || imageFile instanceof Blob) 
                        ? URL.createObjectURL(imageFile) 
                        : editingId && categories.find(c => c.id === editingId)?.image 
                          ? categories.find(c => c.id === editingId).image 
                          : null
                    }
                    onCropComplete={(file) => setImageFile(file)}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Optional. Displayed in customer app and website navigation.</p>
              </div>
              
              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-slate-700">
                  Active (visible to customers)
                </label>
              </div>

              <div className="pt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-slate-600 font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white font-medium bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-4 py-3 w-10"><span className="sr-only">Reorder</span></th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 tracking-tight">Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 tracking-tight">Status</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 tracking-tight">Actions</th>
              </tr>
            </thead>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="categories">
                {(provided) => (
                  <tbody 
                    className="bg-white divide-y divide-slate-100"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {filteredCategories.map((category, index) => (
                      <Draggable key={category.id} draggableId={category.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`hover:bg-slate-50/80 transition-colors group ${snapshot.isDragging ? 'bg-slate-50 shadow-md ring-1 ring-slate-200 z-10' : ''}`}
                            style={provided.draggableProps.style}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-slate-400 w-10">
                              <div {...provided.dragHandleProps} aria-label={`Reorder ${category.name}`} className="cursor-grab active:cursor-grabbing p-1 rounded hover:text-slate-600 transition-colors">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                  {category.image ? (
                                    <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-slate-400 font-medium text-xs">{category.name?.charAt(0)}</span>
                                  )}
                                </div>
                                <div className="text-sm font-medium text-slate-900">
                                  {category.name}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 inline-flex text-xs font-medium rounded-md ${
                                category.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {category.is_active ? 'Active' : 'Hidden'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-1">
                              <button 
                                onClick={() => openForm(category)}
                                aria-label={`Edit ${category.name}`}
                                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors inline-flex items-center"
                              >
                                <Edit2 className="w-4 h-4"/>
                              </button>
                              <button 
                                onClick={() => handleDelete(category.id)}
                                aria-label={`Delete ${category.name}`}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors inline-flex items-center"
                              >
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {filteredCategories.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-12 text-center text-sm text-slate-500">
                          {searchTerm ? `No categories match "${searchTerm}"` : 'No categories found. Click "Add Category" to create one.'}
                        </td>
                      </tr>
                    )}
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
