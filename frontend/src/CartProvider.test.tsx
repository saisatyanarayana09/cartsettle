import { render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from './CartProvider';
import { useCart } from './cart-context';
import api from './services/api';

vi.mock('./services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  clearAllBrowserCaches: vi.fn(),
}));

vi.mock('./hooks/useWebSocket', () => ({
  useWebSocket: () => ({ isConnected: false, sendMessage: vi.fn() }),
}));

afterEach(cleanup);

function TestConsumer({ onMount }: { onMount: (cartContext: any) => void }) {
  const cartContext = useCart();
  onMount(cartContext);
  return <div data-testid="test-consumer">Items: {cartContext?.cart?.items?.length || 0}</div>;
}

describe('CartProvider refresh & merge behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('does NOT call /cart/merge/ on refresh for an already logged-in customer', async () => {
    // Customer user is logged in
    localStorage.setItem(
      'smart-kirana-customer-user',
      JSON.stringify({ id: 1, is_customer: true, email: 'shopper@test.com' })
    );

    // Customer cache has Amul Butter with quantity 1
    localStorage.setItem(
      'smart-kirana-customer-cart-cache',
      JSON.stringify({
        items: [{ id: 10, product: 420, product_name: 'Amul Butter', quantity: 1, unit_price: '55.00' }],
      })
    );

    // Server returns authoritative cart with quantity 1
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/cart/') {
        return Promise.resolve({
          data: {
            items: [{ id: 10, product: 420, product_name: 'Amul Butter', quantity: 1, unit_price: '55.00' }],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    let contextValue: any = null;
    render(
      <CartProvider>
        <TestConsumer onMount={(ctx) => (contextValue = ctx)} />
      </CartProvider>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/cart/');
    });

    // CRITICAL: /cart/merge/ must NEVER be called with the customer's own cached cart!
    expect(api.post).not.toHaveBeenCalledWith('/cart/merge/', expect.anything());

    // Cart item quantity remains exactly 1, not 2
    expect(contextValue.cart.items[0].quantity).toBe(1);
  });

  it('only merges GUEST cart once when logging in, and clears guest storage', async () => {
    // User is logged in
    localStorage.setItem(
      'smart-kirana-customer-user',
      JSON.stringify({ id: 1, is_customer: true, email: 'shopper@test.com' })
    );

    // There is an unmerged guest cart from before sign in
    localStorage.setItem(
      'smart-kirana-guest-cart',
      JSON.stringify({
        items: [{ id: 'temp_1', product: 420, product_name: 'Amul Butter', quantity: 1 }],
      })
    );

    (api.post as any).mockResolvedValueOnce({
      data: {
        items: [{ id: 10, product: 420, product_name: 'Amul Butter', quantity: 1, unit_price: '55.00' }],
      },
    });

    (api.get as any).mockResolvedValue({
      data: {
        items: [{ id: 10, product: 420, product_name: 'Amul Butter', quantity: 1, unit_price: '55.00' }],
      },
    });

    render(
      <CartProvider>
        <TestConsumer onMount={() => {}} />
      </CartProvider>
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/cart/merge/', {
        items: [{ product: 420, quantity: 1 }],
      });
    });

    // Guest cart key MUST be removed so subsequent refreshes never re-merge!
    expect(localStorage.getItem('smart-kirana-guest-cart')).toBeNull();
  });
});
