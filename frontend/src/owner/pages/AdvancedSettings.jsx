import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  SlidersHorizontal,
  QrCode,
  ShieldCheck,
  Clock,
  Calendar,
  MessageCircle,
  Gift,
  Megaphone,
  Smartphone,
  Save,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
  Package,
  Database,
  Download,
  RefreshCw,
  FileJson,
  Server
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const AdvancedSettings = () => {
  const [activeTab, setActiveTab] = useState('payments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    // 1. UPI
    upi_id: '',
    upi_payee_name: '',
    enable_dynamic_upi_qr: true,
    upi_qr_image: null,
    // 2. Legal & Compliance
    fssai_license_number: '',
    gstin: '',
    enable_itemized_tax_invoice: true,
    invoice_terms_and_conditions: '',
    // 3. Timings & Emergency Pause
    is_emergency_paused: false,
    emergency_pause_message: '',
    auto_cutoff_orders: true,
    store_timings_json: {},
    // 4. Delivery Slots
    enable_time_slots: true,
    preparation_buffer_minutes: 30,
    max_orders_per_slot: 15,
    time_slots_json: [],
    // 5. WhatsApp Support
    enable_whatsapp_support: true,
    whatsapp_number: '',
    whatsapp_default_message: '',
    whatsapp_order_help_template: '',
    // 6. Loyalty Wallet & Referrals
    referral_bonus_referrer: '50.00',
    referral_bonus_referee: '50.00',
    referral_min_order_amount: '200.00',
    max_wallet_usage_percentage: 50,
    order_cashback_percentage: '2.00',
    // 7. Announcement & Festive
    enable_announcement_bar: true,
    announcement_text: '',
    announcement_bg_color: '#16a34a',
    announcement_text_color: '#ffffff',
    announcement_start_date: '',
    announcement_end_date: '',
    enable_festive_popup: false,
    festive_popup_title: '',
    festive_popup_content: '',
    festive_popup_image: null,
    // 8. Mobile App Version, Downloads Page & Maintenance
    app_name: '',
    app_icon: null,
    app_download_btn_text: 'Download APK',
    min_mobile_version: '1.0.0',
    latest_mobile_version: '1.0.0',
    force_app_update: false,
    app_update_url: '',
    app_update_message: '',
    is_maintenance_mode: false,
    maintenance_message: '',
    maintenance_estimated_end: '',
  });

  // File uploads
  const [upiQrFile, setUpiQrFile] = useState(null);
  const [upiQrPreview, setUpiQrPreview] = useState(null);
  const [festiveImageFile, setFestiveImageFile] = useState(null);
  const [festiveImagePreview, setFestiveImagePreview] = useState(null);
  const [appIconFile, setAppIconFile] = useState(null);
  const [appIconPreview, setAppIconPreview] = useState(null);

  // New slot inputs
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('12:00');
  const [newSlotLabel, setNewSlotLabel] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/store/settings/', { params: { t: Date.now() } });
      const data = res.data;
      setSettings(prev => ({
        ...prev,
        ...data,
        announcement_start_date: data.announcement_start_date ? data.announcement_start_date.slice(0, 16) : '',
        announcement_end_date: data.announcement_end_date ? data.announcement_end_date.slice(0, 16) : '',
        maintenance_estimated_end: data.maintenance_estimated_end ? data.maintenance_estimated_end.slice(0, 16) : '',
        store_timings_json: typeof data.store_timings_json === 'string'
          ? (() => { try { return JSON.parse(data.store_timings_json); } catch(e) { return {}; } })()
          : (data.store_timings_json || {}),
        time_slots_json: typeof data.time_slots_json === 'string'
          ? (() => { try { return JSON.parse(data.time_slots_json); } catch(e) { return []; } })()
          : (Array.isArray(data.time_slots_json) ? data.time_slots_json : []),
      }));
      if (data.upi_qr_image) setUpiQrPreview(data.upi_qr_image);
      if (data.festive_popup_image) setFestiveImagePreview(data.festive_popup_image);
      if (data.app_icon) setAppIconPreview(data.app_icon);
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load advanced store settings.');
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

  const handleTimingChange = (day, field, value) => {
    setSettings(prev => {
      const currentTimings = prev.store_timings_json || {};
      const dayData = currentTimings[day] || { open: '08:00', close: '21:00', is_closed: false };
      return {
        ...prev,
        store_timings_json: {
          ...currentTimings,
          [day]: {
            ...dayData,
            [field]: value
          }
        }
      };
    });
  };

  const handleAddSlot = () => {
    const label = newSlotLabel.trim() || `${newSlotStart} - ${newSlotEnd}`;
    const newSlot = {
      id: Date.now().toString(),
      start_time: newSlotStart,
      end_time: newSlotEnd,
      label
    };
    setSettings(prev => ({
      ...prev,
      time_slots_json: [...(prev.time_slots_json || []), newSlot]
    }));
    setNewSlotLabel('');
  };

  const handleRemoveSlot = (index) => {
    setSettings(prev => ({
      ...prev,
      time_slots_json: (prev.time_slots_json || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpiQrChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUpiQrFile(file);
      setUpiQrPreview(URL.createObjectURL(file));
    }
  };

  const handleFestiveImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFestiveImageFile(file);
      setFestiveImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        // UPI
        upi_id: settings.upi_id?.trim() || '',
        upi_payee_name: settings.upi_payee_name?.trim() || 'Narendra Kirana',
        enable_dynamic_upi_qr: Boolean(settings.enable_dynamic_upi_qr),
        // Legal
        fssai_license_number: (settings.fssai_license_number?.trim() || '').slice(0, 14),
        gstin: (settings.gstin?.trim() || '').toUpperCase().slice(0, 15),
        enable_itemized_tax_invoice: Boolean(settings.enable_itemized_tax_invoice),
        invoice_terms_and_conditions: settings.invoice_terms_and_conditions?.trim() || '',
        // Timings & Pause
        is_emergency_paused: Boolean(settings.is_emergency_paused),
        emergency_pause_message: settings.emergency_pause_message?.trim() || '',
        auto_cutoff_orders: Boolean(settings.auto_cutoff_orders),
        store_timings_json: typeof settings.store_timings_json === 'string'
          ? (() => { try { return JSON.parse(settings.store_timings_json); } catch(e) { return {}; } })()
          : (settings.store_timings_json || {}),
        // Slots
        enable_time_slots: Boolean(settings.enable_time_slots),
        preparation_buffer_minutes: parseInt(settings.preparation_buffer_minutes, 10) || 30,
        max_orders_per_slot: parseInt(settings.max_orders_per_slot, 10) || 15,
        time_slots_json: typeof settings.time_slots_json === 'string'
          ? (() => { try { return JSON.parse(settings.time_slots_json); } catch(e) { return []; } })()
          : (Array.isArray(settings.time_slots_json) ? settings.time_slots_json : []),
        // WhatsApp
        enable_whatsapp_support: Boolean(settings.enable_whatsapp_support),
        whatsapp_number: settings.whatsapp_number?.trim() || '',
        whatsapp_default_message: settings.whatsapp_default_message?.trim() || '',
        whatsapp_order_help_template: settings.whatsapp_order_help_template?.trim() || '',
        // Loyalty & Referrals
        referral_bonus_referrer: (parseFloat(settings.referral_bonus_referrer) || 0).toFixed(2),
        referral_bonus_referee: (parseFloat(settings.referral_bonus_referee) || 0).toFixed(2),
        referral_min_order_amount: (parseFloat(settings.referral_min_order_amount) || 0).toFixed(2),
        max_wallet_usage_percentage: Math.min(100, Math.max(0, parseInt(settings.max_wallet_usage_percentage, 10) || 0)),
        order_cashback_percentage: (parseFloat(settings.order_cashback_percentage) || 0).toFixed(2),
        // Announcement & Festive
        enable_announcement_bar: Boolean(settings.enable_announcement_bar),
        announcement_text: settings.announcement_text?.trim() || '',
        announcement_bg_color: settings.announcement_bg_color || '#16a34a',
        announcement_text_color: settings.announcement_text_color || '#ffffff',
        announcement_start_date: settings.announcement_start_date ? new Date(settings.announcement_start_date).toISOString() : null,
        announcement_end_date: settings.announcement_end_date ? new Date(settings.announcement_end_date).toISOString() : null,
        enable_festive_popup: Boolean(settings.enable_festive_popup),
        festive_popup_title: settings.festive_popup_title?.trim() || '',
        festive_popup_content: settings.festive_popup_content?.trim() || '',
        // Mobile App Version, Downloads Page & Maintenance
        app_name: settings.app_name?.trim() || '',
        app_download_btn_text: settings.app_download_btn_text?.trim() || 'Download APK',
        min_mobile_version: settings.min_mobile_version?.trim() || '1.0.0',
        latest_mobile_version: settings.latest_mobile_version?.trim() || '1.0.0',
        force_app_update: Boolean(settings.force_app_update),
        app_update_url: settings.app_update_url?.trim() || '',
        app_update_message: settings.app_update_message?.trim() || '',
        is_maintenance_mode: Boolean(settings.is_maintenance_mode),
        maintenance_message: settings.maintenance_message?.trim() || '',
        maintenance_estimated_end: settings.maintenance_estimated_end ? new Date(settings.maintenance_estimated_end).toISOString() : null,
      };

      let savePromise;
      if (upiQrFile || festiveImageFile || appIconFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            formData.append(k, JSON.stringify(v));
          } else if (v !== null && v !== undefined) {
            formData.append(k, v);
          }
        });
        if (upiQrFile) formData.append('upi_qr_image', upiQrFile);
        if (festiveImageFile) formData.append('festive_popup_image', festiveImageFile);
        if (appIconFile) formData.append('app_icon', appIconFile);
        savePromise = api.patch('/store/settings/', formData);
      } else {
        savePromise = api.patch('/store/settings/', payload);
      }

      toast.promise(savePromise, {
        loading: 'Saving advanced settings...',
        success: 'Advanced settings saved successfully!',
        error: (err) => {
          const errors = err.response?.data;
          if (errors && typeof errors === 'object') {
            const firstKey = Object.keys(errors)[0];
            const firstVal = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey];
            if (firstVal && typeof firstVal === 'string') return `${firstKey.replace(/_/g, ' ')}: ${firstVal}`;
          }
          return err.response?.data?.detail || 'Failed to save advanced settings.';
        }
      });

      await savePromise;

      // Invalidate frontend caches so settings reflect immediately across tabs/pages
      if (typeof window !== 'undefined') {
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('sk_cache_') || k.includes('store/settings'))) {
              localStorage.removeItem(k);
            }
          }
        } catch (e) {}
      }

      setUpiQrFile(null);
      setFestiveImageFile(null);
      setAppIconFile(null);
      fetchSettings();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const [backupStats, setBackupStats] = useState(null);
  const [fetchingBackupStats, setFetchingBackupStats] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const fetchBackupStats = async () => {
    setFetchingBackupStats(true);
    try {
      const res = await api.get('/store/backup/stats/');
      setBackupStats(res.data);
    } catch (err) {
      console.error('Failed to load backup stats:', err);
    } finally {
      setFetchingBackupStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchBackupStats();
    }
  }, [activeTab]);

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    const toastId = toast.loading('Generating complete store backup...');
    try {
      const response = await api.get('/store/backup/export/', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/json' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `narendra_kirana_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Complete store backup downloaded!', { id: toastId });
    } catch (err) {
      console.error('Backup download error:', err);
      toast.error('Failed to export backup. Please try again.', { id: toastId });
    } finally {
      setDownloadingBackup(false);
    }
  };

  const tabs = [
    { id: 'payments', name: 'UPI & Payments', icon: QrCode, badge: '1' },
    { id: 'legal', name: 'Legal & FSSAI', icon: ShieldCheck, badge: '2' },
    { id: 'timings', name: 'Timings & Pause', icon: Clock, badge: '3' },
    { id: 'slots', name: 'Delivery Slots', icon: Calendar, badge: '4' },
    { id: 'whatsapp', name: 'WhatsApp Support', icon: MessageCircle, badge: '5' },
    { id: 'loyalty', name: 'Wallet & Cashback', icon: Gift, badge: '6' },
    { id: 'announcements', name: 'Marquee & Popup', icon: Megaphone, badge: '7' },
    { id: 'mobile', name: 'Mobile & Maintenance', icon: Smartphone, badge: '8' },
    { id: 'backup', name: 'Data & Backup', icon: Database, badge: '9' },
  ];

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-medium">Loading advanced settings...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-1">
            <Link to="/owner/settings" className="hover:text-slate-900 dark:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300">Advanced Controls</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 from-amber-500 to-orange-600 text-white shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl tracking-tight font-medium text-gray-900 dark:text-white">Advanced Settings</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Configure real-time payments, legal compliance, order pacing, and customer loyalty.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/owner/settings"
            className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-white text-xs font-medium transition-all shadow-sm"
          >
            Basic Settings
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs transition-all flex items-center gap-2 shadow-sm shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Pause Warning Banner */}
      {settings.is_emergency_paused && (
        <div className="p-4 rounded-lg bg-white border-2 border-slate-200/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-slate-900 dark:text-white shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-medium text-slate-900 dark:text-white dark:text-slate-900 dark:text-white">Store is Currently Emergency Paused!</div>
            <p className="text-xs text-slate-900 dark:text-white dark:text-slate-900 dark:text-white mt-0.5">
              Online checkout is temporarily blocked with notice: <em>"{settings.emergency_pause_message || 'Experiencing high volume'}"</em>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('timings')}
            className="text-xs font-medium text-slate-900 dark:text-white dark:text-slate-900 dark:text-white underline hover:opacity-80 shrink-0"
          >
            Adjust Timings
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-medium text-xs whitespace-nowrap transition-all border-b-2 -mb-[2px] ${
                isActive
                  ? 'border-slate-200 text-slate-900 dark:text-white dark:text-slate-900 dark:text-white bg-white dark:bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900 dark:text-white dark:text-slate-900 dark:text-white' : 'text-gray-400'}`} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        {/* ========================================================================= */}
        {/* 1. UPI & PAYMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>Store UPI QR & Payment Management</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Accept UPI payments directly into your bank account with zero gateway fee deductions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Merchant UPI ID / VPA</label>
                <input
                  type="text"
                  name="upi_id"
                  value={settings.upi_id}
                  onChange={handleChange}
                  placeholder="e.g. narendrakirana@okaxis"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Customer payments will be routed to this VPA address.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">UPI Payee Display Name</label>
                <input
                  type="text"
                  name="upi_payee_name"
                  value={settings.upi_payee_name}
                  onChange={handleChange}
                  placeholder="e.g. Narendra Kirana Store"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Name shown inside customer's GPay, PhonePe, or Paytm app.</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Enable Dynamic Vector UPI QR Code</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Generates instant client-side QR codes with exact order total and UPI intent on web and mobile checkout.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="enable_dynamic_upi_qr"
                  checked={settings.enable_dynamic_upi_qr}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Physical Counter Standee QR Image (Optional)</label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30">
                {upiQrPreview ? (
                  <div className="w-24 h-24 rounded-lg bg-white p-1 border shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
                    <img src={upiQrPreview} alt="Standee QR" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-slate-700 border flex items-center justify-center text-gray-400 shrink-0">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-1 text-center sm:text-left">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpiQrChange}
                    className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white file:text-slate-900 dark:text-white hover:file:bg-indigo-100"
                  />
                  <p className="text-[11px] text-gray-400">PNG, JPG, or SVG. Displayed to customers if they want to scan the shop standee.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. LEGAL & COMPLIANCE */}
        {/* ========================================================================= */}
        {activeTab === 'legal' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>Legal & Compliance (FSSAI & GSTIN)</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Display verified license credentials and tax information on all printed and digital invoices.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  14-Digit FSSAI License Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="fssai_license_number"
                    value={settings.fssai_license_number}
                    onChange={handleChange}
                    maxLength={14}
                    placeholder="e.g. 10020042000123"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono"
                  />
                  {settings.fssai_license_number && settings.fssai_license_number.length === 14 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-900 dark:text-white flex items-center gap-1 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Valid</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Mandatory for retail grocery and food product sellers.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  15-Character GSTIN
                </label>
                <input
                  type="text"
                  name="gstin"
                  value={settings.gstin}
                  onChange={handleChange}
                  maxLength={15}
                  placeholder="e.g. 36AAAAA0000A1Z5"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono uppercase"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Printed on tax invoices for B2B input tax credit.</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Enable Itemized Tax Invoice</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Breaks down CGST, SGST, and IGST components on order receipts and invoice downloads.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="enable_itemized_tax_invoice"
                  checked={settings.enable_itemized_tax_invoice}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Invoice Terms & Return Policy</label>
              <textarea
                name="invoice_terms_and_conditions"
                value={settings.invoice_terms_and_conditions}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                placeholder="1. Goods once sold will not be taken back without original bill.&#10;2. Perishable goods must be reported within 24 hours.&#10;3. In case of dispute, local jurisdiction applies."
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Printed in the terms section at the bottom of all customer invoices.</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. STORE TIMINGS & EMERGENCY PAUSE */}
        {/* ========================================================================= */}
        {activeTab === 'timings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>Store Operating Schedule & Emergency Controls</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Configure automated cut-offs, weekly open hours, or instantly pause incoming orders during high volume.</p>
            </div>

            {/* Emergency Pause Card */}
            <div className={`p-5 rounded-lg border-2 transition-all ${settings.is_emergency_paused ? 'bg-white dark:bg-white border-slate-200/40' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${settings.is_emergency_paused ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-base font-medium text-gray-900 dark:text-white">1-Click Emergency Order Pause</div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Blocks customers from placing orders immediately without taking the store offline.</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="is_emergency_paused"
                    checked={settings.is_emergency_paused}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              {settings.is_emergency_paused && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/40 space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-900 dark:text-white dark:text-slate-900 dark:text-white">Customer Alert Notice</label>
                  <input
                    type="text"
                    name="emergency_pause_message"
                    value={settings.emergency_pause_message}
                    onChange={handleChange}
                    placeholder="We are experiencing high order volume and will resume shortly!"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              )}
            </div>

            {/* Auto Cutoff Toggle */}
            <div className="p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Automated Order Cut-Off</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Automatically prevent customers from placing orders when store is outside scheduled operating hours.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="auto_cutoff_orders"
                  checked={settings.auto_cutoff_orders}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            {/* Weekly Schedule */}
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Weekly Operating Schedule</div>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map((day) => {
                  const dayData = (settings.store_timings_json || {})[day] || { open: '08:00', close: '21:00', is_closed: false };
                  return (
                    <div
                      key={day}
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        dayData.is_closed ? 'bg-white dark:bg-white border-slate-200 dark:border-slate-800/40' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:w-36">
                        <span className="font-medium capitalize text-sm text-gray-900 dark:text-white">{day}</span>
                        {dayData.is_closed && (
                          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-white text-slate-900 dark:text-white dark:text-slate-900 dark:text-white">
                            Closed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 flex-1">
                        {!dayData.is_closed ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 dark:text-slate-400">Open:</span>
                            <input
                              type="time"
                              value={dayData.open || '08:00'}
                              onChange={(e) => handleTimingChange(day, 'open', e.target.value)}
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white text-gray-900 dark:text-white font-mono"
                            />
                            <span className="text-gray-500 dark:text-slate-400 mx-1">to</span>
                            <span className="text-gray-500 dark:text-slate-400">Close:</span>
                            <input
                              type="time"
                              value={dayData.close || '21:00'}
                              onChange={(e) => handleTimingChange(day, 'close', e.target.value)}
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white text-gray-900 dark:text-white font-mono"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-900 dark:text-white font-medium">Orders paused for the entire day.</span>
                        )}
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={Boolean(dayData.is_closed)}
                          onChange={(e) => handleTimingChange(day, 'is_closed', e.target.checked)}
                          className="rounded text-slate-900 dark:text-white focus:ring-slate-900 focus:border-slate-900"
                        />
                        <span className="text-xs text-gray-600 dark:text-slate-400">Closed Today</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. DELIVERY & PICKUP TIME SLOTS */}
        {/* ========================================================================= */}
        {activeTab === 'slots' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>Delivery & Pickup Time Slots</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Allow customers to choose specific delivery/pickup windows with enforced order capacity limits.</p>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Enable Scheduled Time Slots</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">When enabled, customers must select a slot during checkout (Today / Tomorrow).</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="enable_time_slots"
                  checked={settings.enable_time_slots}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Preparation Buffer Time (Minutes)</label>
                <input
                  type="number"
                  name="preparation_buffer_minutes"
                  value={settings.preparation_buffer_minutes}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Slots starting within this time from now will be hidden for Today.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max Orders per Slot Cap</label>
                <input
                  type="number"
                  name="max_orders_per_slot"
                  value={settings.max_orders_per_slot}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Prevents packing bottlenecks; slots showing fully booked will reject new orders.</p>
              </div>
            </div>

            {/* Slots List & Builder */}
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Configured Time Slots</div>
              <div className="space-y-2 mb-4">
                {(settings.time_slots_json || []).length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed text-center text-xs text-gray-400">
                    No time slots configured. Add your first slot below.
                  </div>
                ) : (
                  (settings.time_slots_json || []).map((slot, index) => (
                    <div
                      key={slot.id || index}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{slot.label}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">({slot.start_time} - {slot.end_time})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="text-slate-900 dark:text-white hover:text-slate-900 dark:text-white p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Slot Input Row */}
              <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Slot Label (e.g. Morning 9 AM - 12 PM)"
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white text-gray-900 dark:text-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="time"
                    value={newSlotStart}
                    onChange={(e) => setNewSlotStart(e.target.value)}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white text-gray-900 dark:text-white"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={newSlotEnd}
                    onChange={(e) => setNewSlotEnd(e.target.value)}
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Slot</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. WHATSAPP SUPPORT QUICK-CONNECT */}
        {/* ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>WhatsApp Support Quick-Connect</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Provide 1-click customer help via WhatsApp across customer web and mobile apps.</p>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Enable Floating WhatsApp Bubble & Quick Actions</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Shows floating green chat button on web and mobile home screen.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="enable_whatsapp_support"
                  checked={settings.enable_whatsapp_support}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">WhatsApp Phone Number</label>
              <input
                type="text"
                name="whatsapp_number"
                value={settings.whatsapp_number}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Country code will be automatically normalized when launching WhatsApp.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Default Floating Chat Greeting</label>
              <input
                type="text"
                name="whatsapp_default_message"
                value={settings.whatsapp_default_message}
                onChange={handleChange}
                placeholder="Hi Narendra Kirana, I need assistance with grocery orders."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Order Help Template</label>
              <input
                type="text"
                name="whatsapp_order_help_template"
                value={settings.whatsapp_order_help_template}
                onChange={handleChange}
                placeholder="Hi Narendra Kirana, I need help with Order #{order_id}"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Use <code className="text-slate-900 dark:text-white font-medium">{'{order_id}'}</code> to automatically insert the customer's actual order ID.</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. LOYALTY WALLET & REFERRALS */}
        {/* ========================================================================= */}
        {activeTab === 'loyalty' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>Loyalty Wallet & Referral Rules</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Configure repeat-purchase cashbacks, referral incentives, and order wallet redemption limits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max Wallet Usage per Order (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    name="max_wallet_usage_percentage"
                    value={settings.max_wallet_usage_percentage}
                    onChange={handleChange}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="font-medium text-sm w-12 text-right text-slate-900 dark:text-white dark:text-slate-900 dark:text-white">
                    {settings.max_wallet_usage_percentage}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Caps maximum amount customer can deduct from their wallet balance per checkout.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Order Cashback Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  name="order_cashback_percentage"
                  value={settings.order_cashback_percentage}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Automatically credited to customer's wallet when order is marked COMPLETED.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">Referral Program Rules</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Referrer Reward (₹)</label>
                  <input
                    type="number"
                    step="1"
                    name="referral_bonus_referrer"
                    value={settings.referral_bonus_referrer}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Referee Sign-Up Reward (₹)</label>
                  <input
                    type="number"
                    step="1"
                    name="referral_bonus_referee"
                    value={settings.referral_bonus_referee}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Min Spend to Activate (₹)</label>
                  <input
                    type="number"
                    step="1"
                    name="referral_min_order_amount"
                    value={settings.referral_min_order_amount}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. ANNOUNCEMENT MARQUEE & FESTIVE POPUP */}
        {/* ========================================================================= */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>Announcement Marquee & Festive Popup</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Broadcast high-priority notices, discounts, and festive modals to all shoppers.</p>
            </div>

            {/* Announcement Ticker */}
            <div className="space-y-4 p-5 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-gray-900 dark:text-white">Top Scrolling Announcement Ticker</div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="enable_announcement_bar"
                    checked={settings.enable_announcement_bar}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Announcement Text</label>
                <input
                  type="text"
                  name="announcement_text"
                  value={settings.announcement_text}
                  onChange={handleChange}
                  placeholder="🎉 Free Home Delivery on orders above ₹499! Use code FIRST50 for ₹50 off."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="announcement_bg_color"
                    value={settings.announcement_bg_color || '#16a34a'}
                    onChange={handleChange}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300 block">Banner Background</span>
                    <span className="text-[11px] text-gray-400 font-mono">{settings.announcement_bg_color}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="announcement_text_color"
                    value={settings.announcement_text_color || '#ffffff'}
                    onChange={handleChange}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300 block">Text Color</span>
                    <span className="text-[11px] text-gray-400 font-mono">{settings.announcement_text_color}</span>
                  </div>
                </div>
              </div>

              {/* Live Preview Bar */}
              <div 
                className="py-2 px-4 rounded-lg text-xs font-medium text-center overflow-hidden whitespace-nowrap"
                style={{ backgroundColor: settings.announcement_bg_color || '#16a34a', color: settings.announcement_text_color || '#ffffff' }}
              >
                {settings.announcement_text || 'Announcement ticker preview text...'}
              </div>
            </div>

            {/* Festive Popup Modal */}
            <div className="space-y-4 p-5 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-gray-900 dark:text-white">Festive Offer Welcome Popup</div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="enable_festive_popup"
                    checked={settings.enable_festive_popup}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Popup Title</label>
                <input
                  type="text"
                  name="festive_popup_title"
                  value={settings.festive_popup_title}
                  onChange={handleChange}
                  placeholder="Special Festive Offer! 🪔"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Popup Message Content</label>
                <textarea
                  name="festive_popup_content"
                  value={settings.festive_popup_content}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Enjoy flat discounts on all festival sweets, dry fruits, and grocery essentials!"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">Festive Banner Image (Optional)</label>
                <div className="flex items-center gap-4">
                  {festiveImagePreview && (
                    <img src={festiveImagePreview} alt="Festive Preview" className="w-20 h-14 object-cover rounded-lg border shadow-sm" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFestiveImageChange}
                    className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white file:text-slate-900 dark:text-white hover:file:bg-indigo-100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. MOBILE APP VERSION & MAINTENANCE CONTROL */}
        {/* ========================================================================= */}
        {activeTab === 'mobile' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>Mobile App Branding, Downloads Page & Maintenance</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Customize the public downloads page (icon, title, APK download button), set version gates, and trigger storewide maintenance.</p>
            </div>

            {/* Downloads Hub Branding & Customization */}
            <div className="p-5 rounded-lg border bg-white border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div>
                <div className="text-base font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-900 dark:text-white" />
                  <span>Downloads Page Branding & APK Setup</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Customize the app icon, title, and download button shown on the public downloads hub (<span className="font-mono text-slate-900 dark:text-white dark:text-slate-900 dark:text-white font-medium">narendra-kirana-downloads.vercel.app</span>).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: App Icon Cropper */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-2">
                    App Icon / Logo
                  </label>
                  <ImageCropper
                    aspect={1}
                    currentImageUrl={appIconPreview || settings.app_icon}
                    label="Upload App Icon"
                    onCropComplete={(file) => {
                      setAppIconFile(file);
                      setAppIconPreview(URL.createObjectURL(file));
                    }}
                  />
                  <p className="text-[11px] text-gray-400 mt-2">
                    1:1 Square icon recommended. Formats: PNG, JPG, WebP.
                  </p>
                </div>

                {/* Right: App Name & Button Text */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                      App Name / Title
                    </label>
                    <input
                      type="text"
                      name="app_name"
                      value={settings.app_name}
                      onChange={handleChange}
                      placeholder="e.g. Narendra Kirana"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">If blank, defaults to Store Name.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Download Button Text
                    </label>
                    <input
                      type="text"
                      name="app_download_btn_text"
                      value={settings.app_download_btn_text}
                      onChange={handleChange}
                      placeholder="Download APK"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Customer App APK Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        name="app_update_url"
                        value={settings.app_update_url}
                        onChange={handleChange}
                        placeholder="https://github.com/saisatyanarayana09/narendra-kirana/releases/download/latest/narendra-kirana.apk"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono text-xs"
                      />
                      <a
                        href={settings.app_update_url || 'https://github.com/saisatyanarayana09/narendra-kirana/releases/download/latest/narendra-kirana.apk'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white hover:text-slate-900 dark:text-white transition shrink-0"
                        title="Test direct download link"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Direct APK download link for the Customer mobile app.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Owner App APK Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        name="owner_app_update_url"
                        value={settings.owner_app_update_url}
                        onChange={handleChange}
                        placeholder="https://github.com/saisatyanarayana09/narendra-kirana/releases/download/owner-latest/narendra-kirana-owner.apk"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono text-xs"
                      />
                      <a
                        href={settings.owner_app_update_url || 'https://github.com/saisatyanarayana09/narendra-kirana/releases/download/owner-latest/narendra-kirana-owner.apk'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white hover:text-slate-900 dark:text-white transition shrink-0"
                        title="Test direct download link"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Direct APK download link for the Store Owner mobile app.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Delivery Partner App APK Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        name="delivery_app_update_url"
                        value={settings.delivery_app_update_url}
                        onChange={handleChange}
                        placeholder="https://github.com/saisatyanarayana09/narendra-kirana/releases/download/delivery-latest/narendra-kirana-delivery.apk"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono text-xs"
                      />
                      <a
                        href={settings.delivery_app_update_url || 'https://github.com/saisatyanarayana09/narendra-kirana/releases/download/delivery-latest/narendra-kirana-delivery.apk'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white hover:text-slate-900 dark:text-white transition shrink-0"
                        title="Test direct download link"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Direct APK download link for the Delivery Partner fleet app.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Whole Store Maintenance Mode */}
            <div className={`p-5 rounded-lg border-2 transition-all ${settings.is_maintenance_mode ? 'bg-white dark:bg-white border-slate-200/40' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-medium text-gray-900 dark:text-white">Whole-Store Maintenance Mode</div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Shows full-screen maintenance message on both customer web and mobile app.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="is_maintenance_mode"
                    checked={settings.is_maintenance_mode}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              {settings.is_maintenance_mode && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/40 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-900 dark:text-white dark:text-slate-900 dark:text-white mb-1">Maintenance Message</label>
                    <input
                      type="text"
                      name="maintenance_message"
                      value={settings.maintenance_message}
                      onChange={handleChange}
                      placeholder="We are upgrading our servers to serve you better. Back online soon!"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-900 dark:text-white dark:text-slate-900 dark:text-white mb-1">Estimated Completion Time</label>
                    <input
                      type="datetime-local"
                      name="maintenance_estimated_end"
                      value={settings.maintenance_estimated_end}
                      onChange={handleChange}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile App Version Gates */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Mobile App Release & Force-Update Gates</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Latest App Version</label>
                  <input
                    type="text"
                    name="latest_mobile_version"
                    value={settings.latest_mobile_version}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettings(prev => ({
                        ...prev,
                        latest_mobile_version: val,
                        min_mobile_version: val,
                      }));
                    }}
                    placeholder="1.3.0"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Set to your newest release version (e.g. 1.3.1).</p>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Force App Update</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="force_app_update"
                      checked={settings.force_app_update}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-white border border-slate-200 dark:border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Target In-App APK Download URL</span>
                  <span className="text-[10px] font-medium text-slate-900 dark:text-white dark:text-slate-900 dark:text-white bg-white dark:bg-white px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                    Synced with Downloads Setup
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-800 dark:text-slate-200 truncate select-all">
                  {settings.app_update_url || 'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/narendra-kirana.apk'}
                </div>
                <p className="text-[11px] text-gray-400">
                  💡 <strong>1-Tap In-App Updates:</strong> Customers on older versions will download and install this APK package right inside the app with live progress. Edit this link above in <em>Downloads Page Branding & APK Setup</em>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Force Update Prompt Message</label>
                <input
                  type="text"
                  name="app_update_message"
                  value={settings.app_update_message}
                  onChange={handleChange}
                  placeholder="A critical new version of Narendra Kirana is available. Please update to continue shopping."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* 9. DATABASE & STORE BACKUP */}
        {activeTab === 'backup' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-white text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                      <span>1-Click Database & Store Backup</span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-white text-slate-900 dark:text-white dark:text-slate-900 dark:text-white font-medium border border-slate-200 dark:border-slate-800">
                        Live Cloud Protection
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Download a complete offline copy of your products, orders, customers, and store settings in standard JSON format.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchBackupStats}
                disabled={fetchingBackupStats}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingBackupStats ? 'animate-spin text-slate-900 dark:text-white' : ''}`} />
                <span>Refresh Counts</span>
              </button>
            </div>

            {/* Cloud Status Banner */}
            <div className="p-5 rounded-lg bg-slate-900 hover:bg-slate-800 from-slate-900 to-slate-950 text-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-white border border-slate-200/20 text-slate-900 dark:text-white flex items-center justify-center shrink-0">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-medium text-white">Database Engine</span>
                    <span className="text-xs text-slate-900 dark:text-white font-mono font-semibold">
                      {backupStats?.database || 'Neon Serverless PostgreSQL (AWS)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Continuous Write-Ahead Logging (WAL) & Point-In-Time Restore active on cloud.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 self-start md:self-auto">
                <span>Last Verified:</span>
                <span className="text-slate-200">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Live Data Counts Grid */}
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">
                Live Records Included in Backup
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Products & Catalog</div>
                  <div className="text-xl tracking-tight font-semibold tracking-tight text-gray-900 dark:text-white mt-1">
                    {fetchingBackupStats ? '...' : (backupStats?.products_count ?? '—')}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Active items in store</div>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Categories</div>
                  <div className="text-xl tracking-tight font-semibold tracking-tight text-gray-900 dark:text-white mt-1">
                    {fetchingBackupStats ? '...' : (backupStats?.categories_count ?? '—')}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Departments & aisles</div>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Orders & Invoices</div>
                  <div className="text-xl tracking-tight font-semibold tracking-tight text-slate-900 dark:text-white dark:text-slate-900 dark:text-white mt-1">
                    {fetchingBackupStats ? '...' : (backupStats?.orders_count ?? '—')}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">All lifetime order logs</div>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-medium text-gray-500 dark:text-slate-400">Users & Accounts</div>
                  <div className="text-xl tracking-tight font-semibold tracking-tight text-slate-900 dark:text-white dark:text-slate-900 dark:text-white mt-1">
                    {fetchingBackupStats ? '...' : (backupStats?.users_count ?? '—')}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Customers & partners</div>
                </div>
              </div>
            </div>

            {/* Main 1-Click Action Card */}
            <div className="p-6 rounded-lg bg-white border-2 border-slate-200/30 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-base font-semibold tracking-tight text-slate-900 dark:text-white dark:text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                  <FileJson className="w-5 h-5 text-slate-900 dark:text-white dark:text-slate-900 dark:text-white" />
                  <span>Instant 1-Click Offline Backup (.json)</span>
                </div>
                <p className="text-xs text-slate-900 dark:text-white dark:text-slate-900 dark:text-white/80 leading-relaxed max-w-xl">
                  Generates an immediate, full-database export compatible with standard Django fixtures. Safe to download anytime without interrupting live customer orders or slowing down the store.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={downloadingBackup}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold tracking-tight text-sm shadow-sm shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 w-full sm:w-auto"
              >
                {downloadingBackup ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Exporting Database...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Full Backup</span>
                  </>
                )}
              </button>
            </div>

            {/* Disaster Recovery & Restore Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-slate-900 dark:text-white" />
                  <span>How to Restore from this Backup</span>
                </div>
                <p className="text-gray-500 dark:text-slate-400 leading-relaxed">
                  If you ever need to restore your store database from this downloaded file, run a single command in your terminal:
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 text-slate-900 dark:text-white font-mono text-[11px] overflow-x-auto">
                  python manage.py loaddata your_backup_file.json
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-slate-900 dark:text-white" />
                  <span>Neon Cloud Time-Travel Protection</span>
                </div>
                <p className="text-gray-500 dark:text-slate-400 leading-relaxed">
                  Your PostgreSQL database is continuously archived on AWS. You can also roll back to any past minute through the{' '}
                  <a
                    href="https://console.neon.tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-slate-900 dark:text-white dark:text-slate-900 dark:text-white hover:underline inline-flex items-center gap-0.5"
                  >
                    Neon Console <ExternalLink className="w-3 h-3" />
                  </a>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSettings;
