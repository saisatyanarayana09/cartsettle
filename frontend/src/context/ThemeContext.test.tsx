import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';

function Consumer() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={() => toggleTheme()}>{theme}</button>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  document.documentElement.classList.remove('dark');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('does not inject palettes from cache or over-the-air events', () => {
  localStorage.setItem('sk_store_theme', JSON.stringify({ brand_theme_preset: 'indigo', custom_primary_color: '#4f46e5' }));
  const setProperty = vi.spyOn(document.documentElement.style, 'setProperty');
  render(<ThemeProvider><Consumer /></ThemeProvider>);
  fireEvent(window, new CustomEvent('sk_theme_updated', { detail: { brand_theme_preset: 'emerald' } }));
  fireEvent(window, new StorageEvent('storage', { key: 'sk_store_theme', newValue: '{"brand_theme_preset":"indigo"}' }));
  expect(setProperty.mock.calls.filter(([name]) => name.startsWith('--color-'))).toEqual([]);
});

it('preserves the existing light and dark mode preference', () => {
  localStorage.setItem('sk_theme', 'light');
  render(<ThemeProvider><Consumer /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'light' }));
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(localStorage.getItem('sk_theme')).toBe('dark');
  fireEvent.click(screen.getByRole('button', { name: 'dark' }));
  expect(document.documentElement.classList.contains('dark')).toBe(false);
});