import os
import re

filepath = 'src/owner/pages/Settings.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add new fields to default state
old_state = """    low_stock_threshold: 5,
    delivery_mode: 'PICKUP',
    delivery_fee: '0.00',
    free_delivery_threshold: '0.00',"""

new_state = """    low_stock_threshold: 5,
    delivery_mode: 'PICKUP',
    is_home_delivery_active: false,
    delivery_fee: '0.00',
    free_delivery_threshold: '0.00',
    min_delivery_order_amount: '150.00',
    allowed_pincodes: '',"""

content = content.replace(old_state, new_state)

# Add numeric parsing logic
old_numeric = "if (['min_order_amount', 'packaging_fee', 'delivery_fee', 'free_delivery_threshold'].includes(key)) {"
new_numeric = "if (['min_order_amount', 'packaging_fee', 'delivery_fee', 'free_delivery_threshold', 'min_delivery_order_amount'].includes(key)) {"
content = content.replace(old_numeric, new_numeric)

# Replace Delivery Rules UI
old_delivery_ui = """        {/* Delivery Rules */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900">Delivery Rules</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Delivery Modes</label>
              <select name="delivery_mode" value={settings.delivery_mode} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="PICKUP">Store Pickup Only</option>
                <option value="DELIVERY">Delivery Only</option>
                <option value="BOTH">Both Pickup & Delivery</option>
              </select>
            </div>
            {(settings.delivery_mode === 'DELIVERY' || settings.delivery_mode === 'BOTH') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard Delivery Fee (₹)</label>
                  <input type="number" step="0.01" name="delivery_fee" value={settings.delivery_fee} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Free Delivery Threshold (₹)</label>
                  <input type="number" step="0.01" name="free_delivery_threshold" value={settings.free_delivery_threshold} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"/>
                  <p className="text-xs text-gray-500 mt-1">Waive delivery fee if order is above this amount.</p>
                </div>
              </div>
            )}
          </div>
        </div>"""

new_delivery_ui = """        {/* Delivery Rules */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Truck className="w-5 h-5 text-slate-400"/>
            <h2 className="text-lg font-bold text-slate-900">Home Delivery Rules</h2>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_home_delivery_active" checked={settings.is_home_delivery_active} onChange={handleChange} className="sr-only peer"/>
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <div>
                <span className="text-sm font-bold text-slate-900 block">Enable Home Delivery</span>
                <span className="text-xs text-slate-500">Allow customers to choose home delivery at checkout</span>
              </div>
            </div>

            {settings.is_home_delivery_active && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Delivery Fee (₹)</label>
                    <input type="number" step="0.01" name="delivery_fee" value={settings.delivery_fee} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
                    <p className="text-xs text-slate-500 mt-1">Standard cost per delivery.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Free Threshold (₹)</label>
                    <input type="number" step="0.01" name="free_delivery_threshold" value={settings.free_delivery_threshold} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
                    <p className="text-xs text-slate-500 mt-1">Waive fee if order > this amount.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Minimum Order (₹)</label>
                    <input type="number" step="0.01" name="min_delivery_order_amount" value={settings.min_delivery_order_amount} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
                    <p className="text-xs text-slate-500 mt-1">Minimum cart total required.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Allowed Delivery Pincodes</label>
                  <textarea 
                    name="allowed_pincodes" 
                    value={settings.allowed_pincodes} 
                    onChange={handleChange} 
                    placeholder="e.g., 530001, 530002, 530004"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                  ></textarea>
                  <p className="text-xs text-slate-500 mt-1">Comma-separated list. Leave blank to allow delivery anywhere.</p>
                </div>
              </div>
            )}
          </div>
        </div>"""

content = content.replace(old_delivery_ui, new_delivery_ui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
