import React, { useState } from 'react';
import { Save, Loader2, Image as ImageIcon, Link as LinkIcon, Edit2 } from 'lucide-react';
import ImageCropper from './ImageCropper';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function MidPageBannerEditor({ section, onUpdateSection, onSave }) {
  const [image, setImage] = useState(section.banner_image || null);
  const [link, setLink] = useState(section.banner_link || '');
  const [saving, setSaving] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCropping(true);
    }
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob) => {
    setCropping(false);
    setSelectedFile(null);
    if (!croppedBlob) return;
    
    // Save image instantly
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('banner_image', croppedBlob, 'mid_page_banner.jpg');
      formData.append('section_type', 'banner'); // Ensure type is maintained
      
      const res = await api.patch(`/store/homepage-sections/${section.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImage(res.data.banner_image);
      onUpdateSection({ ...section, banner_image: res.data.banner_image });
      toast.success('Banner image updated!');
    } catch {
      toast.error('Failed to upload image.');
    } finally {
      setSaving(false);
    }
  };

  const saveLink = async () => {
    setSaving(true);
    try {
      await api.patch(`/store/homepage-sections/${section.id}/`, { banner_link: link, section_type: 'banner' });
      onUpdateSection({ ...section, banner_link: link });
      toast.success('Banner link saved!');
    } catch {
      toast.error('Failed to save link.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {cropping && selectedFile && (
        <ImageCropper
          file={selectedFile}
          aspectRatio={4 / 1} // Ultra-wide 4:1 strip
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setCropping(false);
            setSelectedFile(null);
          }}
        />
      )}

      {/* Image Preview / Upload */}
      <div className="w-full md:w-2/3">
        <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
          <ImageIcon size={16} /> Desktop & Mobile Banner Image
        </p>
        <label className="relative flex flex-col items-center justify-center w-full aspect-[4/1] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-100 hover:border-emerald-300 transition-colors cursor-pointer overflow-hidden group">
          {image ? (
            <>
              <img loading="lazy" decoding="async" src={image} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2">
                <Edit2 size={18} /> Change Image
              </div>
            </>
          ) : (
            <div className="text-center p-4">
              <ImageIcon size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-500">Upload Ultra-Wide Strip (4:1)</p>
              <p className="text-xs text-slate-400 mt-1">Recommended: 1200x300px</p>
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={saving} />
        </label>
      </div>

      {/* Settings */}
      <div className="w-full md:w-1/3 space-y-4">
        <div>
          <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <LinkIcon size={16} /> Click Destination URL
          </label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="e.g. /products?category=Snacks"
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <p className="text-xs text-slate-400 mt-1">Where should the user go when they tap the banner?</p>
        </div>
        <button
          onClick={saveLink}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Link Settings
        </button>
      </div>
    </div>
  );
}
