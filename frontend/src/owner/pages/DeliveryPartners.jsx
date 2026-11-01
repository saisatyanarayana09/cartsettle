import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, User, Phone, Bike, CheckCircle2, 
  Clock, AlertCircle, RefreshCw, X, Shield, Search 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function DeliveryPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    vehicle_type: 'Bike',
    vehicle_number: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPartners = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get('/delivery/partners/');
      setPartners(res.data || []);
    } catch (err) {
      console.error('Failed to load delivery partners:', err);
      toast.error('Failed to load delivery partners.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleAddPartner = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      await api.post('/delivery/partners/', formData);
      toast.success('Delivery partner added successfully! 🛵');
      setIsAddModalOpen(false);
      setFormData({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        vehicle_type: 'Bike',
        vehicle_number: ''
      });
      fetchPartners(true);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create delivery partner.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            <span>Delivery Fleet</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your delivery personnel and shift availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPartners(false)}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-slate-900 dark:text-white' : ''} />
          </button>

          <button
            onClick={() => { setFormError(''); setIsAddModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition shadow-sm"
          >
            <Plus size={16} />
            <span>Add Partner</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm max-w-md">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search riders..."
          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
        />
      </div>

      {/* List View */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">No delivery partners found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Rider</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tasks</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((partner) => (
                <tr key={partner.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{partner.name}</div>
                    <div className="text-xs text-slate-500">@{partner.username}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">{partner.phone || '-'}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {partner.vehicle_type} {partner.vehicle_number ? `(${partner.vehicle_number})` : ''}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-slate-900 dark:text-white">{partner.active_orders_count} active</div>
                    <div className="text-xs text-slate-500">{partner.total_deliveries} total</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-medium text-slate-900 dark:text-white">Add Partner</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddPartner} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded bg-red-50 text-red-600 text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                  <input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                  <input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-slate-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                  <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                  <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input required value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Vehicle Type</label>
                  <select value={formData.vehicle_type} onChange={e => setFormData({...formData, vehicle_type: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-slate-400">
                    <option value="Bike">Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Van">Van</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Reg. Number</label>
                  <input value={formData.vehicle_number} onChange={e => setFormData({...formData, vehicle_number: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-slate-400" />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-1.5 rounded text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition disabled:opacity-50">Save Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
