// Runs in the document head, before React or the legacy app downloads.
export const STARTUP_THEME_SCRIPT = `(() => {
  let saved;
  try { saved = window.localStorage.getItem('sk_theme'); } catch {}
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
})();`;