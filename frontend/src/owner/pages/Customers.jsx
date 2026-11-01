import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  User as UserIcon,
  UserCheck,
  UserX,
  Bell,
  X,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import api from '../../services/api';
import { createPortal } from 'react-dom';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'inactive' | 'locked' | 'delete_requested'

  const [notifyUser, setNotifyUser] = useState(null);
  const [notifForm, setNotifForm] = useState({ title: '', message: '' });
  const [notifSending, setNotifSending] = useState(false);

  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchCustomerDetails = async (id) => {
    try {
      setDetailsLoading(true);
      const { data } = await api.get(`/auth/customers/${id}/details/`);
      setSelectedCustomerDetail(data);
    } catch (err) {
      alert('Failed to load customer details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/customers/');
      const data = response.data;
      const list = data?.customers || data?.results || (Array.isArray(data) ? data : []);
      setCustomers(list);
      if (data?.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to fetch customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Compute counts (using backend counts if present, or deriving from list)
  const totalCount = counts?.total ?? customers.length;
  const activeCount = counts?.active ?? customers.filter((c) => c.is_active && !c.is_locked).length;
  const inactiveCount = counts?.inactive ?? customers.filter((c) => !c.is_active).length;
  const lockedCount = counts?.locked ?? customers.filter((c) => c.is_locked).length;
  const deleteRequestedCount =
    counts?.delete_requested ??
    customers.filter((c) => c.customer_profile?.delete_requested).length;

  // Filter customers by activeTab and searchQuery
  const displayedCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Tab filter
      if (activeTab === 'active' && (!c.is_active || c.is_locked)) return false;
      if (activeTab === 'inactive' && c.is_active) return false;
      if (activeTab === 'locked' && !c.is_locked) return false;
      if (activeTab === 'delete_requested' && !c.customer_profile?.delete_requested) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
        const username = (c.username || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.customer_profile?.mobile_number || '').toLowerCase();
        const idStr = String(c.id);

        return (
          fullName.includes(q) ||
          username.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          idStr.includes(q)
        );
      }
      return true;
    });
  }, [customers, activeTab, searchQuery]);

  const handleUnlockUser = async (userId, username) => {
    if (
      !window.confirm(
        `Are you sure you want to unlock account "${username}"? This will reset consecutive failed attempts and re-enable login access immediately.`
      )
    ) {
      return;
    }
    try {
      setActionInProgress(userId);
      await api.post(`/auth/customers/${userId}/unlock/`);
      await fetchCustomers();
      if (selectedCustomerDetail && selectedCustomerDetail.id === userId) {
        await fetchCustomerDetails(userId);
      }
      alert(`Account "${username}" has been unlocked successfully!`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to unlock account.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleActivateUser = async (userId, username) => {
    if (
      !window.confirm(
        `Are you sure you want to activate account "${username}"? The customer will immediately be able to log in and shop.`
      )
    ) {
      return;
    }
    try {
      setActionInProgress(userId);
      await api.post(`/auth/customers/${userId}/activate/`);
      await fetchCustomers();
      if (selectedCustomerDetail && selectedCustomerDetail.id === userId) {
        await fetchCustomerDetails(userId);
      }
      alert(`Account "${username}" has been activated successfully!`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to activate account.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLockUser = async (userId, username) => {
    const reason = window.prompt(
      `Enter reason for manually locking account "${username}":`,
      'Locked by store administrator'
    );
    if (reason === null) return;
    try {
      setActionInProgress(userId);
      await api.post(`/auth/customers/${userId}/lock/`, { reason });
      await fetchCustomers();
      if (selectedCustomerDetail && selectedCustomerDetail.id === userId) {
        await fetchCustomerDetails(userId);
      }
      alert(`Account "${username}" has been locked.`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to lock account.');
    } finally {
      setActionInProgress(null);
    }
  };

  const approveDeletion = async (userId) => {
    if (
      !window.confirm(
        'Are you sure you want to PERMANENTLY delete this customer and all their data? This cannot be undone.'
      )
    )
      return;
    try {
      await api.post(`/auth/customers/${userId}/approve-delete/`);
      fetchCustomers();
    } catch (err) {
      alert('Failed to approve deletion.');
    }
  };

  const rejectDeletion = async (userId) => {
    if (!window.confirm('Are you sure you want to reject this deletion request?')) return;
    try {
      await api.post(`/auth/customers/${userId}/reject-delete/`);
      fetchCustomers();
    } catch (err) {
      alert('Failed to reject deletion.');
    }
  };

  const sendNotification = async (e) => {
    e.preventDefault();
    setNotifSending(true);
    try {
      await api.post('/notifications/owner/send/', {
        user: notifyUser.id,
        title: notifForm.title,
        message: notifForm.message,
      });
      alert('Notification sent successfully!');
      setNotifyUser(null);
      setNotifForm({ title: '', message: '' });
    } catch (err) {
      alert('Failed to send notification.');
    } finally {
      setNotifSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            View, filter, and manage registered customers
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Top Summary Metric Cards: Total, Active, Inactive, Locked */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers Card */}
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'all'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Total Customers
              </span>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {totalCount}
              </div>
              <p className="text-xs font-medium text-slate-500">
                All registered accounts
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <Users size={22} />
            </div>
          </div>
        </button>

        {/* Active Customers Card */}
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'active'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                Active Customers
              </span>
              <div className="text-3xl font-black text-emerald-700 tracking-tight">
                {activeCount}
              </div>
              <p className="text-xs font-medium text-slate-500">
                Active shopping accounts
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                activeTab === 'active'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <UserCheck size={22} />
            </div>
          </div>
        </button>

        {/* Inactive Customers Card */}
        <button
          type="button"
          onClick={() => setActiveTab('inactive')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'inactive'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Inactive Customers
              </span>
              <div className="text-3xl font-black text-slate-700 tracking-tight">
                {inactiveCount}
              </div>
              <p className="text-xs font-medium text-slate-500">
                Deactivated accounts
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                activeTab === 'inactive'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <UserX size={22} />
            </div>
          </div>
        </button>

        {/* Locked Accounts Card */}
        <button
          type="button"
          onClick={() => setActiveTab('locked')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'locked'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-200 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700">
                Locked Accounts
              </span>
              <div className="text-3xl font-black text-rose-700 tracking-tight">
                {lockedCount}
              </div>
              <p className="text-xs font-medium text-slate-500">
                Brute-force / blocked
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                activeTab === 'locked'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Lock size={22} />
            </div>
          </div>
        </button>
      </div>

      {/* Pending Deletion Alert (if any customers requested deletion) */}
      {deleteRequestedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {deleteRequestedCount} Account Deletion Request{deleteRequestedCount > 1 ? 's' : ''} Pending Review
              </p>
              <p className="text-xs text-amber-700 font-medium">
                Review and approve or reject customer account deletion requests.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('delete_requested')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
              activeTab === 'delete_requested'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            Review Requests
          </button>
        </div>
      )}

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl inline-flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Customers ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-emerald-700'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'inactive'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
          <button
            onClick={() => setActiveTab('locked')}
            className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'locked'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-500 hover:text-rose-700'
            }`}
          >
            Locked ({lockedCount})
          </button>
          {deleteRequestedCount > 0 && (
            <button
              onClick={() => setActiveTab('delete_requested')}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'delete_requested'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              Delete Requests ({deleteRequestedCount})
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="font-bold text-slate-600 text-sm">Loading customer directory...</p>
          </div>
        ) : displayedCustomers.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {searchQuery ? 'No matching customers found' : 'No customers in this view'}
            </h3>
            <p className="text-slate-500 mt-1 font-medium text-sm">
              {searchQuery
                ? `No customers match "${searchQuery}". Try a different name or phone number.`
                : activeTab === 'inactive'
                ? 'There are currently no inactive or deleted accounts.'
                : activeTab === 'delete_requested'
                ? 'There are no pending customer deletion requests.'
                : 'When customers register, they will appear here.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                    Username
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                    Mobile Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {displayedCustomers.map((customer) => {
                  const isDeleteRequested = customer.customer_profile?.delete_requested;

                  return (
                    <tr
                      key={customer.id}
                      onClick={(e) => {
                        if (e.target.closest('button')) return;
                        fetchCustomerDetails(customer.id);
                      }}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* Customer Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-extrabold group-hover:bg-indigo-100 transition-colors">
                            {customer.first_name ? (
                              customer.first_name[0].toUpperCase()
                            ) : (
                              <UserIcon size={18} />
                            )}
                          </div>
                          <div className="ml-3.5">
                            <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                              {customer.first_name || 'Customer'}{' '}
                              {customer.last_name || ''}
                            </div>
                            <div className="text-xs font-medium text-slate-400">
                              ID: #{customer.id}
                              {customer.email ? ` · ${customer.email}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-700 font-mono">
                          {customer.username}
                        </div>
                      </td>

                      {/* Mobile Number */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-700">
                          {customer.customer_profile?.mobile_number
                            ? `+91 ${customer.customer_profile.mobile_number}`
                            : 'N/A'}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer.is_locked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                            <Lock size={12} />
                            Locked ({customer.failed_login_attempts || 0} failed)
                          </span>
                        ) : isDeleteRequested ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <AlertTriangle size={12} />
                            Delete Requested
                          </span>
                        ) : customer.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {customer.is_locked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlockUser(customer.id, customer.username);
                              }}
                              disabled={actionInProgress === customer.id}
                              className="text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 border border-emerald-200 shadow-sm"
                              title="Unlock Account"
                            >
                              <Unlock size={14} /> Unlock
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLockUser(customer.id, customer.username);
                              }}
                              disabled={actionInProgress === customer.id}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                              title="Manually Lock Account"
                            >
                              <Lock size={13} /> Lock
                            </button>
                          )}

                          {!customer.is_active && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActivateUser(customer.id, customer.username);
                              }}
                              disabled={actionInProgress === customer.id}
                              className="text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 border border-emerald-200 shadow-sm"
                              title="Activate Account"
                            >
                              <UserCheck size={14} /> Activate
                            </button>
                          )}

                          {customer.is_active && !customer.is_locked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotifyUser(customer);
                              }}
                              className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                              title="Send Notification"
                            >
                              <Bell size={14} /> Notify
                            </button>
                          )}

                          {isDeleteRequested && (
                            <div className="flex items-center gap-1 bg-red-50 border border-red-100 p-1 rounded-xl">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveDeletion(customer.id);
                                }}
                                className="text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                title="Approve Deletion"
                              >
                                <CheckCircle size={13} /> Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rejectDeletion(customer.id);
                                }}
                                className="text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                title="Reject Deletion"
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            </div>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchCustomerDetails(customer.id);
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notify User Modal */}
      {notifyUser &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-extrabold text-xl text-slate-900">
                  Notify {notifyUser.first_name || notifyUser.username}
                </h3>
                <button
                  onClick={() => setNotifyUser(null)}
                  className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={sendNotification} className="p-6 space-y-5">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Title</label>
                  <input
                    required
                    value={notifForm.title}
                    onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Special Offer!"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Message</label>
                  <textarea
                    required
                    value={notifForm.message}
                    onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all h-28 resize-none"
                    placeholder="Type your message here..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setNotifyUser(null)}
                    className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={notifSending}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {notifSending ? 'Sending...' : 'Send Notification'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Customer Detail Modal */}
      {selectedCustomerDetail &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      Customer Profile
                      {selectedCustomerDetail.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Inactive
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">ID: #{selectedCustomerDetail.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomerDetail(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto">
                {detailsLoading ? (
                  <div className="py-12 text-center text-slate-500 font-medium">
                    Loading details...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                        <div className="text-xs font-bold text-indigo-900 mb-1 uppercase tracking-wider">
                          Lifetime Sales
                        </div>
                        <div className="text-2xl font-extrabold text-indigo-700">
                          ₹{selectedCustomerDetail.total_spent?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                        <div className="text-xs font-bold text-emerald-900 mb-1 uppercase tracking-wider">
                          Total Orders
                        </div>
                        <div className="text-2xl font-extrabold text-emerald-700">
                          {selectedCustomerDetail.total_orders || 0}
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                        <div className="text-xs font-bold text-amber-900 mb-1 uppercase tracking-wider">
                          Wallet Balance
                        </div>
                        <div className="text-2xl font-extrabold text-amber-700">
                          ₹{selectedCustomerDetail.wallet_balance?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>

                    {/* Inactive Account Activation Card */}
                    {!selectedCustomerDetail.is_active && (
                      <div className="p-4 rounded-xl border bg-amber-50/70 border-amber-200 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                            <div>
                              <div className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                                Account Inactive (Pending Verification)
                              </div>
                              <div className="text-xs text-amber-700 mt-0.5">
                                This customer has not activated their account yet.
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleActivateUser(selectedCustomerDetail.id, selectedCustomerDetail.username)}
                            disabled={actionInProgress === selectedCustomerDetail.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition shrink-0"
                          >
                            <UserCheck size={14} /> Activate Account
                          </button>
                        </div>

                        {selectedCustomerDetail.activation_link && (
                          <div className="pt-2 border-t border-amber-200/70 space-y-1.5">
                            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                              Account Activation Link:
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={selectedCustomerDetail.activation_link}
                                className="w-full bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono select-all outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedCustomerDetail.activation_link);
                                  setCopiedLink(true);
                                  setTimeout(() => setCopiedLink(false), 2000);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold transition shrink-0 shadow-2xs"
                                title="Copy link to clipboard"
                              >
                                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                              </button>
                            </div>
                            <p className="text-[11px] text-amber-700">
                              You can copy this link and send it directly to the customer via WhatsApp or SMS.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Account Security & Brute-Force Lockout Card */}
                    <div className={`p-4 rounded-xl border space-y-3 ${selectedCustomerDetail.is_locked ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={18} className={selectedCustomerDetail.is_locked ? "text-rose-600" : "text-emerald-600"} />
                          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                            Account Security & Lockout Status
                          </h3>
                        </div>
                        {selectedCustomerDetail.is_locked ? (
                          <button
                            onClick={() => handleUnlockUser(selectedCustomerDetail.id, selectedCustomerDetail.username)}
                            disabled={actionInProgress === selectedCustomerDetail.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                          >
                            <Unlock size={14} /> Unlock Account
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLockUser(selectedCustomerDetail.id, selectedCustomerDetail.username)}
                            disabled={actionInProgress === selectedCustomerDetail.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-xs font-bold shadow-sm transition"
                          >
                            <Lock size={14} /> Manually Lock Account
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
                          <span className="text-slate-400 block font-medium">Access Status</span>
                          <span className={`font-bold flex items-center gap-1 mt-0.5 ${selectedCustomerDetail.is_locked ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {selectedCustomerDetail.is_locked ? (
                              <>
                                <Lock size={13} /> Locked (Blocked)
                              </>
                            ) : (
                              <>
                                <CheckCircle size={13} /> Normal (Access Granted)
                              </>
                            )}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
                          <span className="text-slate-400 block font-medium">Consecutive Failed Logins</span>
                          <span className={`font-bold mt-0.5 block ${selectedCustomerDetail.failed_login_attempts >= 10 ? 'text-rose-600' : selectedCustomerDetail.failed_login_attempts > 5 ? 'text-amber-600' : 'text-slate-800'}`}>
                            {selectedCustomerDetail.failed_login_attempts || 0} / 10 threshold
                          </span>
                        </div>
                        {selectedCustomerDetail.is_locked && (
                          <div className="sm:col-span-2 bg-rose-100/60 p-3 rounded-lg border border-rose-200 text-rose-900 text-xs">
                            <span className="font-extrabold block">Lock Reason:</span>
                            <span className="font-medium">{selectedCustomerDetail.lockout_reason || '10 consecutive failed login attempts'}</span>
                            {selectedCustomerDetail.locked_at && (
                              <div className="text-[11px] text-rose-700 mt-1 font-medium">
                                Locked at: {new Date(selectedCustomerDetail.locked_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                        {selectedCustomerDetail.last_failed_login_ip && (
                          <div className="sm:col-span-2 bg-white p-2.5 rounded-lg border border-slate-100 text-slate-600 flex flex-wrap justify-between gap-1">
                            <span>Last Failed IP: <strong className="font-mono text-slate-800">{selectedCustomerDetail.last_failed_login_ip}</strong></span>
                            {selectedCustomerDetail.last_failed_login_at && (
                              <span className="text-slate-400">
                                {new Date(selectedCustomerDetail.last_failed_login_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">
                        Contact Information
                      </h3>
                      <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-slate-500">Name</span>
                          <span className="text-sm font-bold text-slate-900">
                            {selectedCustomerDetail.first_name || 'Customer'}{' '}
                            {selectedCustomerDetail.last_name || ''}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-slate-500">Username</span>
                          <span className="text-sm font-bold text-slate-900 font-mono">
                            {selectedCustomerDetail.username}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-slate-500">Email</span>
                          <span className="text-sm font-bold text-slate-900">
                            {selectedCustomerDetail.email || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-slate-500">Mobile</span>
                          <span className="text-sm font-bold text-slate-900">
                            {selectedCustomerDetail.customer_profile?.mobile_number
                              ? `+91 ${selectedCustomerDetail.customer_profile.mobile_number}`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-slate-500">Date of Birth</span>
                          <span className="text-sm font-bold text-slate-900">
                            {selectedCustomerDetail.customer_profile?.dob || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-slate-500">Referral Code</span>
                          <span className="text-sm font-bold text-slate-900 font-mono">
                            {selectedCustomerDetail.customer_profile?.referral_code || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Orders */}
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-500 mb-3 uppercase tracking-wider">
                        Recent Orders
                      </h3>
                      {selectedCustomerDetail.recent_orders?.length > 0 ? (
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">
                                  Order ID
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">
                                  Status
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                              {selectedCustomerDetail.recent_orders.map((order) => (
                                <tr key={order.id}>
                                  <td className="px-4 py-3 text-sm font-bold text-indigo-600 font-mono">
                                    {order.id}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                    {order.status}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">
                                    ₹{order.total_amount?.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-sm font-medium text-slate-500 border border-slate-100">
                          No orders found for this customer.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Customers;
