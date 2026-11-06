import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import OrdersHistory from './OrdersHistory';
const mocks = vi.hoisted(() => ({ get: vi.fn(), cache: vi.fn(), setCache: vi.fn() }));
vi.mock('../../services/api', () => ({ default: { get: mocks.get }, getUserCacheSync: mocks.cache, setUserCache: mocks.setCache }));
vi.mock('../../router', () => ({ Link: ({ children, to }: any) => <a href={to}>{children}</a> }));
vi.mock('../../hooks/useWebSocket', () => ({ useWebSocket: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); mocks.cache.mockReturnValue({ detail: 'Unavailable' }); });
afterEach(cleanup);
it('recovers from malformed cached and returned orders through retry', async () => {
 mocks.get.mockResolvedValueOnce({ data: { detail: 'Unavailable' } }).mockResolvedValueOnce({ data: [{ id: 123, status: 'COMPLETED', total_amount: '85', created_at: '2026-11-05T12:00:00Z', items: [] }] });
 render(<OrdersHistory />);
 await screen.findByRole('alert');
 expect(mocks.setCache).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
 await waitFor(() => expect(mocks.setCache).toHaveBeenCalledWith('/orders/', [expect.objectContaining({ id: 123 })]));
 expect(screen.queryByRole('alert')).not.toBeInTheDocument();
 expect(screen.getByRole('link', { name: /123/ })).toHaveAttribute('href', '/orders/123');
});