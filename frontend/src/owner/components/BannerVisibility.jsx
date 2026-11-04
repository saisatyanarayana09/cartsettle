import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Switch } from '@/components/ui/switch';
import api from '../../services/api';

export default function BannerVisibility() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    let active = true;
    api.get('/offers/banners/').then(({ data }) => {
      const rows = Array.isArray(data) ? data : data?.results;
      if (!Array.isArray(rows)) throw new Error('Invalid banners response');
      if (active) setBanners(rows);
    }).catch(() => {
      if (active) setFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const toggle = async (id, isActive) => {
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/offers/banners/${id}/`, { is_active: isActive });
      setBanners(prev => prev.map(banner => banner.id === id ? { ...banner, is_active: isActive } : banner));
    } catch {
      toast.error('Could not update banner visibility.');
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
      <div className="md:col-span-1">
        <h2 className="text-base font-medium text-foreground">Banner Visibility</h2>
      </div>
      <div className="md:col-span-2 divide-y divide-border">
        {loading ? <p className="py-4 text-sm text-muted-foreground">Loading banners…</p>
          : failed ? <p className="py-4 text-sm text-muted-foreground">Banners could not be loaded.</p>
          : banners.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No banners yet.</p>
          : banners.map(banner => (
            <div key={banner.id} className="flex items-center justify-between gap-4 py-4">
              <span className="min-w-0 break-words text-sm text-foreground">{banner.title || `Banner ${banner.id}`}</span>
              <Switch aria-label={`Show ${banner.title || `banner ${banner.id}`}`} checked={Boolean(banner.is_active)} disabled={Boolean(saving[banner.id])} onCheckedChange={checked => toggle(banner.id, checked)} />
            </div>
          ))}
      </div>
    </section>
  );
}