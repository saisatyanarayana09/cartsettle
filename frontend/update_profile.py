import os
import re

filepath = 'src/profile/pages/AccountSettings.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add requestDeletion function
function_code = '''
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deleteRequested = user?.customer_profile?.delete_requested || false;

  const requestDeletion = async () => {
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
  };
'''

content = content.replace("const submit = (e) => { e.preventDefault(); saveProfile(); };", function_code + "\n  const submit = (e) => { e.preventDefault(); saveProfile(); };")

# Add the UI
ui_code = '''
        {/* Danger Zone */}
        <div className="mt-8 bg-red-50 rounded-2xl shadow-sm border border-red-200 overflow-hidden p-6 md:p-8">
          <h3 className="text-base font-bold text-red-900 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-700 mb-5">Permanently remove your account and all of your data.</p>
          
          {deleteRequested ? (
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
          )}
        </div>
'''

content = content.replace("</form>\n    </div>", "</form>\n" + ui_code + "    </div>")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
