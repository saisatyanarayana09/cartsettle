import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CartPage from './CartPage.jsx';
import CheckoutPage from './CheckoutPage.jsx';

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), update: vi.fn(), flush: vi.fn(), refresh: vi.fn(), clear: vi.fn(), promo: vi.fn(), get: vi.fn(), post: vi.fn() }));
vi.mock('../../router', () => ({ useNavigate: () => mocks.navigate, Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a> }));
vi.mock('../../customer-layout', () => ({ CustomerLayout: ({ children }: any) => <>{children}</> }));
vi.mock('../../components/PayPalAuthorizeButton', () => ({ default: () => null }));
vi.mock('../../services/api', () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
const item = { id: 4, product: 7, product_name: 'Rice', product_unit: '1 kg', quantity: 1, unit_price: '80', regular_price: '100', stock_quantity: 4, max_order_quantity: 2, is_in_stock: true };
const context = { cart: { items: [item], subtotal: '100', items_total: '80', discount: '20', total: '85', packaging_fee: '5' }, isCustomer: true, storeSettings: { is_open: true, delivery_mode: 'BOTH', delivery_fee: '15' }, update: mocks.update, flushCartSync: mocks.flush, refresh: mocks.refresh, clearCart: mocks.clear, applyPromo: mocks.promo };
vi.mock('../../cart-context', () => ({ useCart: () => context }));
beforeEach(() => { vi.clearAllMocks(); item.quantity = 1; mocks.get.mockImplementation((path: string) => Promise.resolve({ data: path.includes('wallet') ? { balance: '0' } : [] })); mocks.post.mockResolvedValue({ data: { id: 123 } }); });
afterEach(cleanup);
function clickFirstAction(name: string) {
 const button = screen.getAllByRole('button', { name })[0];
 if (!button) throw new Error(`Missing action: ${name}`);
 fireEvent.click(button);
}
it('uses existing cart update for quantity changes', async () => {
 render(<CartPage />);
 fireEvent.click(screen.getByRole('button', { name: 'Increase Rice' }));
 await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(item, 2));
});
it('preserves product maximum quantity', () => {
 item.quantity = 2; render(<CartPage />);
 expect(screen.getByRole('button', { name: 'Increase Rice' })).toBeDisabled();
});
it('flushes pending cart changes before navigating to checkout', async () => {
 render(<CartPage />);
 clickFirstAction('Checkout');
 await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/checkout'));
 expect(mocks.flush.mock.invocationCallOrder[0]).toBeLessThan(mocks.navigate.mock.invocationCallOrder[0] ?? 0);
});
it('submits pickup and cash selections through the existing order endpoint after syncing', async () => {
 render(<CheckoutPage />);
 await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/auth/addresses/'));
 fireEvent.click(screen.getByRole('button', { name: 'Pickup' }));
 fireEvent.click(screen.getByRole('button', { name: 'Pay at Store' }));
 clickFirstAction('Place order');
 await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/orders/', expect.objectContaining({ order_type: 'PICKUP', payment_method: 'COD', delivery_address: 'In-Store Pickup', delivery_pincode: '000000' })));
 expect(mocks.flush.mock.invocationCallOrder[0]).toBeLessThan(mocks.post.mock.invocationCallOrder[0] ?? 0);
 expect(mocks.clear).toHaveBeenCalledOnce();
});
it('does not clear the cart when ordering fails', async () => {
 mocks.post.mockRejectedValue(new Error('Unavailable')); render(<CheckoutPage />);
 await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/auth/addresses/'));
 fireEvent.click(screen.getByRole('button', { name: 'Pickup' }));
 fireEvent.click(screen.getByRole('button', { name: 'Pay at Store' }));
 clickFirstAction('Place order');
 await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
 expect(mocks.clear).not.toHaveBeenCalled();
});
