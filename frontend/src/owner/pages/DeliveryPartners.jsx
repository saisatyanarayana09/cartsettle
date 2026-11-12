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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DBCF] dark:border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl font-medium text-[#2D1822] dark:text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#5E4752] dark:text-[#C5B0BA]" />
            <span>Delivery Fleet</span>
          </h1>
          <p className="text-sm text-[#7D6671] mt-1">
            Manage your delivery personnel and shift availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPartners(false)}
            disabled={refreshing}
            className="p-2 rounded-lg border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#351D28] text-[#5E4752] dark:text-[#C5B0BA] hover:bg-[#FAF5EF] dark:hover:bg-[#3F2231] transition shadow-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-[#2D1822] dark:text-white' : ''} />
          </button>

          <button
            onClick={() => { setFormError(''); setIsAddModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#56323E] hover:bg-[#432634] text-[#FAF5EF] dark:bg-[#EFDFD2] dark:hover:bg-[#E7DBCF] dark:text-[#2D1822] font-medium text-sm transition shadow-sm"
          >
            <Plus size={16} />
            <span>Add Partner</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white dark:bg-[#351D28] px-3 py-2 rounded-lg border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm max-w-md">
        <Search size={16} className="text-[#A68B98]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search riders..."
          className="w-full bg-transparent text-sm text-[#2D1822] dark:text-white placeholder-[#A68B98] outline-none"
        />
      </div>

      {/* List View */}
      {loading ? (
        <div className="py-12 text-center text-sm text-[#7D6671]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-[#E7DBCF] dark:border-white/[0.08]">
          <p className="text-sm text-[#7D6671]">No delivery partners found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#351D28] rounded-lg border border-[#E7DBCF] dark:border-white/[0.08] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7DBCF] dark:border-white/[0.08] bg-[#FAF5EF]/50 dark:bg-[#3F2231]/50">
                <th className="px-5 py-3 text-xs font-medium text-[#7D6671] uppercase tracking-wider">Rider</th>
                <th className="px-5 py-3 text-xs font-medium text-[#7D6671] uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3 text-xs font-medium text-[#7D6671] uppercase tracking-wider">Vehicle</th>
                <th className="px-5 py-3 text-xs font-medium text-[#7D6671] uppercase tracking-wider">Tasks</th>
                <th className="px-5 py-3 text-xs font-medium text-[#7D6671] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DBCF] dark:divide-white/[0.08]">
              {filtered.map((partner) => (
                <tr key={partner.id} className="hover:bg-[#FAF5EF]/50 dark:hover:bg-[#3F2231]/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium text-[#2D1822] dark:text-white">{partner.name}</div>
                    <div className="text-xs text-[#7D6671]">@{partner.username}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-[#5E4752] dark:text-[#C5B0BA]">{partner.phone || '-'}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-[#5E4752] dark:text-[#C5B0BA]">
                      {partner.vehicle_type} {partner.vehicle_number ? `(${partner.vehicle_number})` : ''}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-[#2D1822] dark:text-white">{partner.active_orders_count} active</div>
                    <div className="text-xs text-[#7D6671]">{partner.total_deliveries} total</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#F2E9E0] dark:bg-[#3F2231] text-xs font-medium text-[#5E4752] dark:text-[#C5B0BA]">
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
        <div className="fixed inset-0 z-50 bg-[#56323E]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="owner-theme w-full max-w-md bg-white dark:bg-[#351D28] border border-[#E7DBCF] dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden text-[#2D1822] dark:text-[#FAF5EF]">
            <div className="px-5 py-4 border-b border-[#E7DBCF] dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="text-base font-medium text-[#2D1822] dark:text-white">Add Partner</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#A68B98] hover:text-[#5E4752]">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddPartner} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded bg-red-50 text-red-600 text-sm">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1">First Name</label>
                  <input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] rounded px-3 py-1.5 text-sm outline-none focus:border-[#D9C6B8]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1">Last Name</label>
                  <input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] rounded px-3 py-1.5 text-sm outline-none focus:border-[#D9C6B8]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1">Username</label>
                  <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] rounded px-3 py-1.5 text-sm outline-none focus:border-[#D9C6B8]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1">Password</label>
                  <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] rounded px-3 py-1.5 text-sm outline-none focus:border-[#D9C6B8]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1">Phone Number</label>
                <input required value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] rounded px-3 py-1.5 text-sm outline-none focus:border-[#D9C6B8]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1">Vehicle Type</label>
                  <select value={formData.vehicle_type} onChange={e => setFormData({...formData, vehicle_type: e.target.value})} className="w-full border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] rounded px-3 py-1.5 text-sm outline-none focus:border-[#D9C6B8]">
                    <option value="Bike">Bike</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Van">Van</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E4752] dark:text-[#C5B0BA] mb-1">Reg. Number</label>
                  <input value={formData.vehicle_number} onChange={e => setFormData({...formData, vehicle_number: e.target.value})} className="w-full border border-[#E7DBCF] dark:border-white/[0.08] bg-white dark:bg-[#3F2231] rounded px-3 py-1.5 text-sm outline-none focus:border-[#D9C6B8]" />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-1.5 rounded text-sm text-[#5E4752] hover:bg-[#F2E9E0] dark:hover:bg-[#3F2231] transition">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 rounded bg-[#56323E] hover:bg-[#432634] text-white text-sm font-medium transition disabled:opacity-50">Save Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
