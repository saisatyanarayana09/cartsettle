import { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext(null);

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
      metaTheme.setAttribute('content', isDarkMode ? '#181a1b' : getComputedStyle(root).getPropertyValue('--color-primary-500').trim());
    }
  }, [theme]);

  // Sync theme changes across browser tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'sk_theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
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
