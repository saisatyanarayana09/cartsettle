import { useState } from 'react';
import { X, Plus, Search, Save, Loader2, ArrowRightLeft } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

export const stripEmojis = (str) => {
  if (!str) return '';
  return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '').trim();
};

export default function HomepageSectionEditor({ 
  section, 
  allProducts, 
  onUpdateItems, 
  onSave 
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const cleanTitle = stripEmojis(section?.title) || 'Section';
  const items = section.items || [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(section.id, items);
      toast.success(`Products saved successfully in "${cleanTitle}"!`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to save products in "${cleanTitle}". Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (product) => {
    const isAdded = items.some(i => i.id === product.id);
    let newItems;
    if (isAdded) {
      newItems = items.filter(i => i.id !== product.id);
    } else {
      newItems = [...items, {
        id: product.id, name: product.name, image: product.image,
        regular_price: product.regular_price, offer_price: product.offer_price,
        is_in_stock: product.is_in_stock, position: items.length,
      }];
    }
    onUpdateItems(section.id, newItems);
  };

  const removeProduct = (id) => {
    const newItems = items.filter(i => i.id !== id);
    onUpdateItems(section.id, newItems);
  };

  const addedIds = new Set(items.map(i => i.id));
  const filteredProducts = allProducts.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (price) => price ? `₹${Number(price).toFixed(2)}` : '—';

  return (
    <div className="space-y-4">
      {/* ── Action Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition"
          >
            <Plus className="w-4 h-4" />
            Add Products
          </button>
          
          <span className="text-xs font-semibold text-slate-500">
            {items.length} products in section
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm font-bold bg-emerald-600 text-white px-5 py-2 rounded-xl hover:bg-emerald-700 transition disabled:opacity-60 whitespace-nowrap shadow-sm shadow-emerald-200"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save {cleanTitle}
        </button>
      </div>

      {/* ── Horizontal Product Grid ─────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="font-semibold text-slate-500 mb-1">No products in {cleanTitle} yet.</p>
          <p className="text-xs">Click <strong>Add Products</strong> to curate this section.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Note: droppableId is prefixed with 'products-' to distinguish it in Showcase onDragEnd */}
          <Droppable droppableId={`products-${section.id}`} direction="horizontal" type="product">
            {(provided, snapshot) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x ${snapshot.isDraggingOver ? 'bg-emerald-50/50 rounded-2xl' : ''}`}
              >
                {items.map((item, idx) => (
                  <Draggable key={`product-${item.id}`} draggableId={`product-${section.id}-${item.id}`} index={idx}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`w-40 sm:w-48 shrink-0 snap-start bg-white border rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing group hover:border-emerald-300 hover:shadow-lg transition-all relative ${
                          snapshot.isDragging ? 'shadow-2xl ring-2 ring-emerald-500 border-emerald-500 z-50' : 'border-gray-200'
                        }`}
                        style={provided.draggableProps.style}
                      >
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeProduct(item.id); }}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm text-gray-400 rounded-full hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute top-2 left-2 p-1.5 bg-white/90 backdrop-blur-sm text-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm">
                          <ArrowRightLeft className="w-3 h-3" />
                        </div>
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full z-10 shadow-sm">
                          #{idx + 1}
                        </div>
                        <div className="aspect-square bg-gray-50 border-b border-gray-100 p-2 pointer-events-none">
                          {(item.image || item.name?.toLowerCase().includes('pumpkin'))
                            ? <img 
                                loading="lazy"
                                decoding="async"
                                src={item.name?.toLowerCase().includes('pumpkin') && (!item.image || item.image.includes('dummyimage.com')) ? '/media/products/pumpkin_seeds.jpg' : item.image} 
                                alt={item.name} 
                                onError={(e) => { if (item.name?.toLowerCase().includes('pumpkin')) e.currentTarget.src = '/media/products/pumpkin_seeds.jpg'; }}
                                className="w-full h-full object-contain mix-blend-multiply" 
                              />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-black">{item.name?.charAt(0)}</div>
                          }
                        </div>
                        <div className="p-3 pointer-events-none">
                          <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{item.name}</p>
                          <div className="mt-1.5 flex items-baseline gap-1.5">
                            {item.offer_price && Number(item.offer_price) < Number(item.regular_price)
                              ? <><span className="text-sm font-extrabold text-emerald-600">{fmt(item.offer_price)}</span> <span className="text-xs font-bold text-gray-400 line-through">{fmt(item.regular_price)}</span></>
                              : <span className="text-sm font-extrabold text-gray-900">{fmt(item.regular_price)}</span>
                            }
                          </div>
                          {!item.is_in_stock && <span className="text-[10px] uppercase tracking-wider font-extrabold text-red-600 mt-1 block">Out of stock</span>}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}

      {/* ── Add Products Modal ──────────────────────────────────────────── */}
      {pickerOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col h-[85vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Curate {cleanTitle}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Select products to feature in this showcase section.</p>
              </div>
              <button onClick={() => { setPickerOpen(false); setSearch(''); }} className="text-slate-400 hover:text-slate-600 transition-colors p-2 bg-slate-50 rounded-full hover:bg-slate-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products by name or category…"
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No products found</h3>
                  <p className="text-slate-500 mt-1">Try a different search term.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredProducts.map(p => {
                    const isAdded = addedIds.has(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProduct(p)}
                        className={`relative p-3 rounded-2xl cursor-pointer transition-all ${
                          isAdded 
                            ? 'bg-emerald-50 ring-2 ring-emerald-500 shadow-md' 
                            : 'bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-lg'
                        }`}
                      >
                        {isAdded && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center z-10 shadow-sm">
                            <span className="text-white text-xs font-black">✓</span>
                          </div>
                        )}
                        <div className="aspect-square bg-slate-50 rounded-xl mb-3 p-2 border border-slate-100">
                          {(p.image || p.name?.toLowerCase().includes('pumpkin'))
                            ? <img 
                                loading="lazy"
                                decoding="async"
                                src={p.name?.toLowerCase().includes('pumpkin') && (!p.image || p.image.includes('dummyimage.com')) ? '/media/products/pumpkin_seeds.jpg' : p.image} 
                                alt={p.name} 
                                onError={(e) => { if (p.name?.toLowerCase().includes('pumpkin')) e.currentTarget.src = '/media/products/pumpkin_seeds.jpg'; }}
                                className="w-full h-full object-contain mix-blend-multiply" 
                              />
                            : <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-2xl">{p.name?.charAt(0)}</div>
                          }
                        </div>
                        <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-1 font-semibold">{fmt(p.offer_price || p.regular_price)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 md:px-6 md:py-4 border-t border-slate-100 bg-white flex justify-between items-center flex-shrink-0 rounded-b-3xl">
              <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                {items.length} products selected
              </span>
              <button 
                type="button" 
                onClick={() => { setPickerOpen(false); setSearch(''); }} 
                className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}


