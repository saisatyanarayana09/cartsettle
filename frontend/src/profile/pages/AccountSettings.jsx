import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Camera } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../../cart-context';
import ImageCropper from '../../owner/components/ImageCropper';

export default function AccountSettings() {
  const { user, syncUser } = useCart();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    mobile_number: user?.customer_profile?.mobile_number || '',
    dob: user?.customer_profile?.dob || '',
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cropperFile, setCropperFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const avatarUrl = imagePreview || user?.avatar || user?.customer_profile?.avatar || user?.customer_profile?.avatar_url || user?.customer_profile?.profile_picture;
  const hasExistingPhone = Boolean(user?.customer_profile?.mobile_number);

  const initials = (
    user?.first_name
      ? user.first_name.slice(0, 2)
      : user?.username
      ? user.username.slice(0, 2)
      : 'NK'
  ).toUpperCase();

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB.');
        return;
      }
      setCropperFile(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedFile, objectUrl) => {
    setSelectedImage(croppedFile);
    setImagePreview(objectUrl);
    setCropperFile(null);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim()) {
      toast.error('Full name is required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('first_name', form.first_name.trim());

      const customerProfileData = {
        dob: form.dob || null,
      };

      if (!hasExistingPhone && form.mobile_number) {
        const clean = form.mobile_number.replace(/\D/g, '');
        if (clean.length === 10) {
          customerProfileData.mobile_number = clean;
        }
      }

      formData.append('customer_profile', JSON.stringify(customerProfileData));

      if (selectedImage) {
        formData.append('profile_picture', selectedImage);
      }

      const { data } = await api.put('/auth/profile/', formData);
      localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data));
      syncUser();
      toast.success('Changes saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const completion = user?.profile_completion?.percentage ?? (form.dob ? 100 : 80);
  const isComplete = completion === 100;

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link
          to="/profile"
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors inline-flex items-center gap-1 mb-3"
        >
          <ChevronRight className="rotate-180" size={14} /> Back to dashboard
        </Link>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Account settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage your personal details</p>
      </div>

      <form onSubmit={saveProfile} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        {/* Photo Upload Section */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          {!isComplete ? (
            <div className="relative size-16 flex items-center justify-center shrink-0">
              <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="4"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * completion) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                {completion}%
              </div>
            </div>
          ) : (
            <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          )}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Camera size={13} /> Change photo
            </button>
            <p className="text-[11px] text-slate-400 mt-1">1:1 square crop • Max 10MB</p>
          </div>
        </div>

        {cropperFile && (
          <ImageCropper
            aspect={1}
            aspectRatio={1}
            file={cropperFile}
            onCropComplete={handleCropComplete}
            onCancel={() => setCropperFile(null)}
          />
        )}

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Full name
            </label>
            <input
              required
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-emerald-600 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                Verified
              </span>
            </div>
            <input
              disabled
              readOnly
              type="email"
              value={user?.email || user?.username || ''}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-medium text-slate-500 cursor-not-allowed outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mobile number
              </label>
              {hasExistingPhone && (
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              )}
            </div>
            <input
              disabled={hasExistingPhone}
              readOnly={hasExistingPhone}
              type="tel"
              value={form.mobile_number}
              onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
              placeholder="10-digit mobile number"
              className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs font-medium outline-none ${
                hasExistingPhone
                  ? 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-600'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Date of birth
            </label>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 text-xs font-medium focus:ring-1 focus:ring-emerald-600 outline-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
