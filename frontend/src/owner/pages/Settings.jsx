import { useState, useEffect } from 'react';
import { Link } from '../../router';
import { SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StoreRadiusMapPicker from '../components/StoreRadiusMapPicker';
import BannerVisibility from '../components/BannerVisibility';

const Settings = () => {
  const [settings, setSettings] = useState({
    store_name: 'CartSettle',
    store_address: '',
    store_phone: '',
    store_email: '',
    is_open: true,
    min_order_amount: '0.00',
    packaging_fee: '0.00',
    low_stock_threshold: 5,
    delivery_mode: 'PICKUP',
    is_home_delivery_active: false,
    delivery_fee: '0.00',
    free_delivery_threshold: '0.00',
    min_delivery_order_amount: '150.00',
    allowed_pincodes: '',
    store_latitude: 17.385044,
    store_longitude: 78.486671,
    delivery_radius_km: 5.00,
    enforce_delivery_radius: false,
    auto_accept_orders: false,
    // Homepage section visibility + titles
    show_popular_picks: true,
    popular_picks_title: 'Popular picks',
    show_great_deals: true,
    great_deals_title: 'Great Deals',
    show_new_arrivals: true,
    new_arrivals_title: 'New Arrivals',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/store/settings/', { params: { t: Date.now() } });
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        setSettings(prev => Object.fromEntries(Object.entries(prev).map(([key, value]) =>
          [key, key === 'store_name' ? 'CartSettle' : response.data[key] ?? value]
        )));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        store_name: 'CartSettle',
        store_address: settings.store_address?.trim() || '',
        store_phone: (settings.store_phone?.trim() || '').slice(0, 20),
        store_email: settings.store_email?.trim() || '',
        is_open: Boolean(settings.is_open),
        min_order_amount: (parseFloat(settings.min_order_amount) || 0).toFixed(2),
        packaging_fee: (parseFloat(settings.packaging_fee) || 0).toFixed(2),
        low_stock_threshold: parseInt(settings.low_stock_threshold, 10) || 0,
        is_home_delivery_active: Boolean(settings.is_home_delivery_active),
        delivery_mode: settings.is_home_delivery_active ? 'BOTH' : 'PICKUP',
        delivery_fee: (parseFloat(settings.delivery_fee) || 0).toFixed(2),
        free_delivery_threshold: (parseFloat(settings.free_delivery_threshold) || 0).toFixed(2),
        min_delivery_order_amount: (parseFloat(settings.min_delivery_order_amount) || 0).toFixed(2),
        allowed_pincodes: settings.allowed_pincodes ? settings.allowed_pincodes.trim() : '',
        store_latitude: settings.store_latitude ? parseFloat(settings.store_latitude).toFixed(6) : '17.385044',
        store_longitude: settings.store_longitude ? parseFloat(settings.store_longitude).toFixed(6) : '78.486671',
        delivery_radius_km: settings.delivery_radius_km ? parseFloat(settings.delivery_radius_km).toFixed(2) : '5.00',
        enforce_delivery_radius: Boolean(settings.enforce_delivery_radius),
        auto_accept_orders: Boolean(settings.auto_accept_orders),
        show_popular_picks: Boolean(settings.show_popular_picks),
        popular_picks_title: settings.popular_picks_title?.trim() || 'Popular picks',
        show_great_deals: Boolean(settings.show_great_deals),
        great_deals_title: settings.great_deals_title?.trim() || 'Great Deals',
        show_new_arrivals: Boolean(settings.show_new_arrivals),
        new_arrivals_title: settings.new_arrivals_title?.trim() || 'New Arrivals',
      };

      const savePromise = api.patch('/store/settings/', payload);

      toast.promise(savePromise, {
        loading: 'Saving settings...',
        success: 'Settings saved successfully!',
        error: (err) => {
          const errors = err.response?.data;
          if (errors && typeof errors === 'object') {
            const firstKey = Object.keys(errors)[0];
            const firstVal = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey];
            if (firstVal && typeof firstVal === 'string') {
              return `${firstKey.replace(/_/g, ' ')}: ${firstVal}`;
            }
          }
          return err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to save settings.';
        }
      });

      await savePromise;
      fetchSettings();
    } catch (err) {
      console.error('Settings save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-[#7D6671] font-medium">Loading settings...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DBCF] dark:border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D1822] dark:text-white tracking-tight">Store Settings</h1>
          <p className="text-sm text-[#7D6671] dark:text-[#C5B0BA] mt-1">Manage your store, orders, delivery zones, and banners.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/owner/advanced-settings"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#56323E] hover:bg-[#432634] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Advanced Settings</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-[#E7DBCF] dark:divide-white/[0.08]">

        {/* Section 1: Store Identity & Operations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-1">
            <h2 className="text-base font-medium text-[#2D1822] dark:text-white">Store Info</h2>
            <p className="text-sm text-[#7D6671] mt-1">Basic information about your store and its location.</p>
          </div>
          <div className="md:col-span-2 space-y-5 bg-white dark:bg-[#351D28] p-6 rounded-lg border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm">
            <div>
              <label className="block text-sm font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1.5">Store Name</label>
              <input 
                type="text" 
                name="store_name" 
                value="CartSettle"
                readOnly 
                onChange={handleChange} 
                required 
                className="w-full rounded-md border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1.5">Store Address</label>
              <textarea 
                name="store_address" 
                value={settings.store_address || ''} 
                onChange={handleChange} 
                rows="2"
                className="w-full rounded-md border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1.5">Store Phone</label>
                <input type="tel" name="store_phone" value={settings.store_phone} onChange={handleChange} className="w-full rounded-md border border-[#E7DBCF] dark:border-white/[0.08] px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1.5">Store Email</label>
                <input type="email" name="store_email" value={settings.store_email} onChange={handleChange} className="w-full rounded-md border border-[#E7DBCF] dark:border-white/[0.08] px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1.5">Latitude</label>
                <input 
                  type="number" step="0.000001" name="store_latitude" 
                  value={settings.store_latitude || ''} onChange={handleChange} 
                  className="w-full rounded-md border border-[#E7DBCF] dark:border-white/[0.08] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1.5">Longitude</label>
                <input 
                  type="number" step="0.000001" name="store_longitude" 
                  value={settings.store_longitude || ''} onChange={handleChange} 
                  className="w-full rounded-md border border-[#E7DBCF] dark:border-white/[0.08] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-sm font-medium text-[#2D1822] dark:text-white">Store is Open</span>
                <p className="text-sm text-[#7D6671]">Toggle to pause incoming orders.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_open" checked={settings.is_open} onChange={handleChange} className="sr-only peer"/>
                <div className="w-9 h-5 bg-[#EFDFD2] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D9C6B8] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#56323E]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Order Constraints & Fees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-1">
            <h2 className="text-base font-medium text-[#2D1822] dark:text-white">Order Constraints</h2>
            <p className="text-sm text-[#7D6671] mt-1">Configure minimum amounts and standard fees.</p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-5 bg-white dark:bg-[#351D28] p-6 rounded-lg border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm">
            <div>
              <label className="block text-sm font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1.5">Min Order Amount (₹)</label>
              <input type="number" step="0.01" name="min_order_amount" value={settings.min_order_amount} onChange={handleChange} required className="w-full rounded-md border border-[#E7DBCF] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1.5">Packaging Fee (₹)</label>
              <input type="number" step="0.01" name="packaging_fee" value={settings.packaging_fee} onChange={handleChange} required className="w-full rounded-md border border-[#E7DBCF] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div className="col-span-2 flex items-center justify-between pt-2">
              <div>
                <span className="text-sm font-medium text-[#2D1822] dark:text-white">Auto-Accept Orders</span>
                <p className="text-sm text-[#7D6671]">Automatically move orders to 'ACCEPTED' state.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="auto_accept_orders" checked={settings.auto_accept_orders} onChange={handleChange} className="sr-only peer"/>
                <div className="w-9 h-5 bg-[#EFDFD2] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D9C6B8] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#56323E]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Delivery Rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-1">
            <h2 className="text-base font-medium text-[#2D1822] dark:text-white">Delivery Zones</h2>
            <p className="text-sm text-[#7D6671] mt-1">Manage delivery areas, fees, and constraints.</p>
          </div>
          <div className="md:col-span-2 space-y-6 bg-white dark:bg-[#351D28] p-6 rounded-lg border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#2D1822] dark:text-white">Enable Home Delivery</span>
                <p className="text-sm text-[#7D6671]">Allow customers to choose home delivery.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_home_delivery_active" checked={settings.is_home_delivery_active} onChange={handleChange} className="sr-only peer"/>
                <div className="w-9 h-5 bg-[#EFDFD2] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D9C6B8] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#56323E]"></div>
              </label>
            </div>

            {settings.is_home_delivery_active && (
              <div className="space-y-5 pt-4 border-t border-[#E7DBCF]">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] mb-1.5">Delivery Fee (₹)</label>
                    <input type="number" step="0.01" name="delivery_fee" value={settings.delivery_fee} onChange={handleChange} className="w-full rounded-md border border-[#E7DBCF] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] mb-1.5">Free Above (₹)</label>
                    <input type="number" step="0.01" name="free_delivery_threshold" value={settings.free_delivery_threshold} onChange={handleChange} className="w-full rounded-md border border-[#E7DBCF] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5E4752] mb-1.5">Min Delivery (₹)</label>
                    <input type="number" step="0.01" name="min_delivery_order_amount" value={settings.min_delivery_order_amount} onChange={handleChange} className="w-full rounded-md border border-[#E7DBCF] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5E4752] mb-1.5">Allowed Pincodes (Comma separated)</label>
                  <input type="text" name="allowed_pincodes" value={settings.allowed_pincodes} onChange={handleChange} placeholder="530001, 530002" className="w-full rounded-md border border-[#E7DBCF] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
                </div>
                <div className="pt-2">
                  <StoreRadiusMapPicker
                    storeLat={settings.store_latitude}
                    storeLng={settings.store_longitude}
                    deliveryRadiusKm={settings.delivery_radius_km}
                    enforceDeliveryRadius={settings.enforce_delivery_radius}
                    onLocationChange={({ lat, lng }) => setSettings(prev => ({ ...prev, store_latitude: lat, store_longitude: lng }))}
                    onRadiusChange={(radius) => setSettings(prev => ({ ...prev, delivery_radius_km: radius }))}
                    onEnforceChange={(enforce) => setSettings(prev => ({ ...prev, enforce_delivery_radius: enforce }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <BannerVisibility />

        <div className="pt-6 flex justify-end">
          <button type="submit" disabled={saving} className="px-5 py-2 bg-[#56323E] text-white rounded-md text-sm font-medium hover:bg-[#432634] transition shadow-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

      </form>

    </div>
  );
};

export default Settings;
