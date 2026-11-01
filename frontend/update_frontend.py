import os
import re

filepath = 'src/profile/pages/AccountSettings.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
content = content.replace(
    "const [deleteLoading, setDeleteLoading] = useState(false);",
    "const [deleteLoading, setDeleteLoading] = useState(false);\n  const [showDeletePrompt, setShowDeletePrompt] = useState(false);\n  const [deletePassword, setDeletePassword] = useState('');"
)

# Update logic
old_func = '''  const requestDeletion = async () => {
    if (!window.confirm('Are you sure you want to request account deletion? This action cannot be undone once approved by the owner.')) return;
    setDeleteLoading(true);
    try {
      await api.post('/auth/request-delete/');
      toast.success('Account deletion requested successfully.');
      
      // Update local storage user object
      const updatedUser = { ...user, customer_profile: { ...user.customer_profile, delete_requested: true } };
      localStorage.setItem('smart-kirana-customer-user', JSON.stringify(updatedUser));
      syncUser();
    } catch (err) {
      toast.error('Failed to request deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };'''

new_func = '''  const requestDeletion = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm.');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.post('/auth/request-delete/', { password: deletePassword });
      toast.success('Account deletion requested successfully.');
      
      // Update local storage user object
      const updatedUser = { ...user, customer_profile: { ...user.customer_profile, delete_requested: true } };
      localStorage.setItem('smart-kirana-customer-user', JSON.stringify(updatedUser));
      syncUser();
      setShowDeletePrompt(false);
      setDeletePassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };'''

content = content.replace(old_func, new_func)

# Update UI
old_ui = '''          {deleteRequested ? (
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm font-bold border border-orange-200">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              Deletion Pending Approval
            </div>
          ) : (
            <button 
              type="button" 
              onClick={requestDeletion}
              disabled={deleteLoading}
              className="bg-white text-red-600 border-2 border-red-200 hover:border-red-600 hover:bg-red-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50"
            >
              {deleteLoading ? 'Processing...' : 'Request Account Deletion'}
            </button>
          )}'''

new_ui = '''          {deleteRequested ? (
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm font-bold border border-orange-200">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              Deletion Pending Approval
            </div>
          ) : showDeletePrompt ? (
            <div className="bg-white border border-red-200 p-4 rounded-xl flex flex-col gap-3 items-start w-full md:w-1/2">
              <label className="text-sm font-bold text-slate-700">Enter your password to confirm</label>
              <input 
                type="password" 
                value={deletePassword} 
                onChange={e => setDeletePassword(e.target.value)} 
                placeholder="Your password" 
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
              <div className="flex gap-2 w-full mt-1">
                <button 
                  type="button" 
                  onClick={requestDeletion}
                  disabled={deleteLoading}
                  className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex-1 disabled:opacity-50"
                >
                  {deleteLoading ? 'Processing...' : 'Confirm Deletion'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowDeletePrompt(false); setDeletePassword(''); }}
                  disabled={deleteLoading}
                  className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={() => setShowDeletePrompt(true)}
              className="bg-white text-red-600 border-2 border-red-200 hover:border-red-600 hover:bg-red-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
            >
              Request Account Deletion
            </button>
          )}'''

content = content.replace(old_ui, new_ui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
