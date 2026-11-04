import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Settings from './Settings.jsx';

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../services/api', () => ({ default: api }));
vi.mock('../../router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('../components/StoreRadiusMapPicker', () => ({ default: () => null }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), promise: vi.fn() } }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.clearAllMocks();
  api.get.mockImplementation((path: string) => Promise.resolve({ data: path === '/offers/banners/'
    ? [{ id: 7, title: 'Fresh produce', is_active: true }]
    : { store_name: 'CartSettle', brand_theme_preset: 'indigo', palette_mode: 3, custom_primary_color: '#4f46e5' } }));
  api.patch.mockResolvedValue({ data: {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('saves business settings without sending any palette fields or accessing email credentials', async () => {
  render(<Settings />);
  fireEvent.click(await screen.findByRole('button', { name: 'Save All Settings' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledOnce());
  const call = api.patch.mock.calls[0];
  if (!call) throw new Error('Settings were not saved');
  const [path, payload] = call;
  expect(path).toBe('/store/settings/');
  expect(payload.store_name).toBe('CartSettle');
  expect(Object.keys(payload).filter(key => /brand_theme|palette|custom_.*color|apply_theme/.test(key))).toEqual([]);
  expect(api.get.mock.calls.map(([path]) => path)).not.toContain('/store/email-settings/');
});

it('updates banner visibility through the existing banner endpoint', async () => {
  render(<Settings />);
  fireEvent.click(await screen.findByRole('switch', { name: 'Show Fresh produce' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/offers/banners/7/', { is_active: false }));
  await waitFor(() => expect(screen.getByRole('switch', { name: 'Show Fresh produce' })).toHaveAttribute('aria-checked', 'false'));
});

it('saves the fixed CartSettle identity even when the server returns an old store name', async () => {
  api.get.mockImplementation((path: string) => Promise.resolve({ data: path === '/offers/banners/' ? [] : { store_name: 'Old store' } }));
  render(<Settings />);
  fireEvent.click(await screen.findByRole('button', { name: 'Save All Settings' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledOnce());
  expect(api.patch.mock.calls[0]?.[1].store_name).toBe('CartSettle');
});

it('keeps banner visibility unchanged when saving fails', async () => {
  api.patch.mockRejectedValue(new Error('Unavailable'));
  render(<Settings />);
  fireEvent.click(await screen.findByRole('switch', { name: 'Show Fresh produce' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByRole('switch', { name: 'Show Fresh produce' })).not.toBeDisabled());
  expect(screen.getByRole('switch', { name: 'Show Fresh produce' })).toHaveAttribute('aria-checked', 'true');
});