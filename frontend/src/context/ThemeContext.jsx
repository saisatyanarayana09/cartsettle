import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export const ThemeContext = createContext(null);

export const THEME_PRESETS = {
  vacation: { primary: '#5ba8a6', dark: '#3d8b89', secondary: '#4d69a5', accent: '#ecd386', canvas: '#f7f5f0', text: '#323232' },
  emerald: { primary: '#059669', dark: '#047857', secondary: '#10b981', accent: '#f59e0b', canvas: '#f8fafc', text: '#0f172a' },
  indigo: { primary: '#4f46e5', dark: '#4338ca', secondary: '#6366f1', accent: '#8b5cf6', canvas: '#f8fafc', text: '#0f172a' },
  warm_sun: { primary: '#f59e0b', dark: '#d97706', secondary: '#ef4444', accent: '#f97316', canvas: '#fffbeb', text: '#1c1917' },
};

export function adjustLuminance(hex, percent) {
  if (!hex || typeof hex !== 'string') return hex;
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export function getContrastTextColor(hex) {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '#ffffff';
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 165 ? '#0f172a' : '#ffffff';
}

export function applyStoreTheme(data) {
  if (!data || typeof window === 'undefined') return;

  let p = THEME_PRESETS[data.brand_theme_preset] || THEME_PRESETS.vacation;
  if (data.brand_theme_preset === 'custom') {
    const customPrimary = data.custom_primary_color || p.primary;
    p = {
      primary: customPrimary,
      dark: adjustLuminance(customPrimary, -15),
      secondary: data.custom_secondary_color || p.secondary,
      accent: data.custom_accent_color || p.accent,
      canvas: data.custom_canvas_color || p.canvas,
      text: data.custom_text_color || p.text,
    };
  }

  const mode = Number(data.palette_mode) || 5;
  const root = document.documentElement;

  const primary50 = adjustLuminance(p.primary, 85);
  const primary100 = adjustLuminance(p.primary, 70);
  const primary200 = adjustLuminance(p.primary, 50);
  const primary300 = adjustLuminance(p.primary, 30);
  const primary400 = adjustLuminance(p.primary, 15);
  const primary500 = p.primary;
  const primary600 = p.dark || adjustLuminance(p.primary, -15);
  const primary700 = adjustLuminance(p.primary, -22);
  const primary800 = adjustLuminance(p.primary, -32);
  const primary900 = adjustLuminance(p.primary, -45);

  root.style.setProperty('--color-primary-50', primary50);
  root.style.setProperty('--color-primary-100', primary100);
  root.style.setProperty('--color-primary-200', primary200);
  root.style.setProperty('--color-primary-300', primary300);
  root.style.setProperty('--color-primary-400', primary400);
  root.style.setProperty('--color-primary-500', primary500);
  root.style.setProperty('--color-primary-600', primary600);
  root.style.setProperty('--color-primary-700', primary700);
  root.style.setProperty('--color-primary-800', primary800);
  root.style.setProperty('--color-primary-900', primary900);

  root.style.setProperty('--color-emerald-50', primary50);
  root.style.setProperty('--color-emerald-100', primary100);
  root.style.setProperty('--color-emerald-200', primary200);
  root.style.setProperty('--color-emerald-300', primary300);
  root.style.setProperty('--color-emerald-400', primary400);
  root.style.setProperty('--color-emerald-500', primary500);
  root.style.setProperty('--color-emerald-600', primary600);
  root.style.setProperty('--color-emerald-700', primary700);
  root.style.setProperty('--color-emerald-800', primary800);
  root.style.setProperty('--color-emerald-900', primary900);

  root.style.setProperty('--color-vacation-teal', p.primary);
  root.style.setProperty('--color-vacation-gold', p.accent);
  root.style.setProperty('--color-accent-gold', p.accent);
  root.style.setProperty('--color-primary-contrast', getContrastTextColor(p.primary));

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme && !root.classList.contains('dark')) {
    metaTheme.setAttribute('content', p.primary);
  }

  if (mode === 2) {
    root.style.setProperty('--color-accent-blue', p.primary);
    root.style.setProperty('--color-vacation-blue', p.primary);
    root.style.setProperty('--color-vacation-cream', '#ffffff');
    root.style.setProperty('--color-vacation-charcoal', '#0f172a');
  } else if (mode === 3) {
    root.style.setProperty('--color-accent-blue', p.secondary);
    root.style.setProperty('--color-vacation-blue', p.secondary);
    root.style.setProperty('--color-vacation-cream', '#f8fafc');
    root.style.setProperty('--color-vacation-charcoal', '#0f172a');
  } else if (mode === 4) {
    root.style.setProperty('--color-accent-blue', p.secondary);
    root.style.setProperty('--color-vacation-blue', p.secondary);
    root.style.setProperty('--color-vacation-cream', p.canvas);
    root.style.setProperty('--color-vacation-charcoal', '#0f172a');
  } else {
    root.style.setProperty('--color-accent-blue', p.secondary);
    root.style.setProperty('--color-vacation-blue', p.secondary);
    root.style.setProperty('--color-vacation-cream', p.canvas);
    root.style.setProperty('--color-vacation-charcoal', p.text);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('sk_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch {
      return 'light';
    }
  });

  const [storeTheme, setStoreTheme] = useState(() => {
    try {
      const cached = localStorage.getItem('sk_store_theme');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Apply cached store theme immediately to prevent color flash
  useEffect(() => {
    try {
      const cached = localStorage.getItem('sk_store_theme');
      if (cached) {
        const parsed = JSON.parse(cached);
        setStoreTheme(parsed);
        applyStoreTheme(parsed);
      }
    } catch {}
  }, []);

  // Apply theme class and data attribute to document.documentElement and body
  useEffect(() => {
    const root = document.documentElement;
    const isDarkMode = theme === 'dark';
    if (isDarkMode) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      document.body.classList.remove('dark');
    }

    // Synchronize browser tab/app header meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDarkMode ? '#181a1b' : '#5ba8a6');
    }
  }, [theme]);

  // Sync theme changes across browser tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'sk_theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setTheme(e.newValue);
      }
      if (e.key === 'sk_store_theme' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setStoreTheme(parsed);
          applyStoreTheme(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Synchronize Cloud Storefront Theme over-the-air
  useEffect(() => {
    let isMounted = true;
    async function fetchStoreTheme() {
      try {
        let data = null;
        try {
          const res = await api.get('/store/public-settings/', { params: { t: Date.now() } });
          data = res.data;
        } catch {
          try {
            const res = await api.get('/store/settings/', { params: { t: Date.now() } });
            data = res.data;
          } catch {
            const raw = await fetch('/api/v1/store/public-settings/');
            if (raw.ok) data = await raw.json();
          }
        }

        if (!isMounted || !data) return;

        localStorage.setItem('sk_store_theme', JSON.stringify(data));
        setStoreTheme(data);
        applyStoreTheme(data);
      } catch (err) {
        console.error('Failed to sync store theme:', err);
      }
    }

    fetchStoreTheme();

    const handleThemeUpdate = (e) => {
      if (e?.detail) {
        try {
          localStorage.setItem('sk_store_theme', JSON.stringify(e.detail));
          setStoreTheme(e.detail);
          applyStoreTheme(e.detail);
        } catch {}
      }
      fetchStoreTheme();
    };

    window.addEventListener('sk_theme_updated', handleThemeUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('sk_theme_updated', handleThemeUpdate);
    };
  }, []);

  const toggleTheme = (mode) => {
    const nextTheme = mode ? mode : (theme === 'dark' ? 'light' : 'dark');
    setTheme(nextTheme);
    try {
      localStorage.setItem('sk_theme', nextTheme);
    } catch (e) {
      console.error('Failed to save theme in localStorage', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, storeTheme, applyStoreTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
