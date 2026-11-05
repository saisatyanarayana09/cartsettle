import React, { useState } from 'react';
import { Link, useNavigate } from '../../router';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ArrowRight, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import { checkOperatingHours } from '../../utils/operatingHours';
import './order-experience.css';

export function CartPage() {
  const navigate = useNavigate();
  const { cart, isCustomer, storeSettings, update, flushCartSync } = useCart();
  const [error, setError] = useState('');
  const [removingIds, setRemovingIds] = useState(new Set());
  const [showBillDrawer, setShowBillDrawer] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const items = cart?.items || [];

  async function change(item, quantity) {
    try { await update(item, quantity); }
    catch { setError('Could not update your cart.'); }
  }
  async function handleQuantityChange(item, quantity) {
    if (quantity <= 0) {
      setRemovingIds(previous => new Set(previous).add(item.id));
      setTimeout(async () => {
        await change(item, 0);
        setRemovingIds(previous => { const next = new Set(previous); next.delete(item.id); return next; });
      }, 200);
    } else { await change(item, quantity); }
  }
  async function handleProceedToCheckout() {
    setProceeding(true);
    try { if (flushCartSync) await flushCartSync(); navigate('/checkout'); }
    catch { setError('Could not save your cart. Please try again.'); }
    finally { setProceeding(false); }
  }
  const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
  const operatingHours = checkOperatingHours(storeSettings);
  const hasOutOfStock = items.some(item => item.is_in_stock === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0));
  const discount = parseFloat(cart?.discount || 0);
  const mrpTotal = parseFloat(cart?.subtotal || 0);
  const itemsTotal = parseFloat(cart?.items_total || mrpTotal - discount) || mrpTotal;
  const packagingFee = parseFloat(cart?.packaging_fee || 0);
  const promoDiscount = parseFloat(cart?.promo_discount || 0);
  const totalPayable = parseFloat(cart?.total || itemsTotal - promoDiscount + packagingFee);
  const freeThreshold = parseFloat(storeSettings?.free_delivery_threshold || 0);
  const freeDeliveryGap = Math.max(0, freeThreshold - itemsTotal);
  const isFreeDeliveryUnlocked = freeThreshold > 0 && itemsTotal >= freeThreshold;
  const minOrderAmount = parseFloat(storeSettings?.min_order_amount || 0);
  const isBelowMinOrder = minOrderAmount > 0 && itemsTotal < minOrderAmount;
  const blockedLabel = storeSettings?.is_open === false ? 'Store closed' : isEmergencyPaused ? 'Orders paused' : operatingHours.isClosed ? 'Store closed' : hasOutOfStock ? 'Remove unavailable items' : isBelowMinOrder ? `Minimum order ₹${minOrderAmount.toFixed(0)}` : '';
  const Bill = () => <div className="space-y-4 text-sm">
    <div className="flex justify-between gap-4 text-muted-foreground"><span>Subtotal</span><span className="tabular-nums text-foreground">₹{(mrpTotal > 0 ? mrpTotal : itemsTotal).toFixed(2)}</span></div>
    {discount > 0 && <div className="flex justify-between gap-4"><span>Savings</span><span className="tabular-nums">−₹{discount.toFixed(2)}</span></div>}
    {promoDiscount > 0 && <div className="flex justify-between gap-4"><span>Coupon</span><span className="tabular-nums">−₹{promoDiscount.toFixed(2)}</span></div>}
    {packagingFee > 0 && <div className="flex justify-between gap-4 text-muted-foreground"><span>Packaging</span><span className="tabular-nums">₹{packagingFee.toFixed(2)}</span></div>}
    <div className="flex justify-between gap-4 text-muted-foreground"><span>Delivery</span><span className="text-right">{isFreeDeliveryUnlocked ? 'Free' : 'Calculated at checkout'}</span></div>
  </div>;
  const CheckoutButton = ({ className = '' }) => <Button onClick={handleProceedToCheckout} disabled={Boolean(blockedLabel) || proceeding} className={`h-12 rounded-md font-bold ${className}`}>{blockedLabel || (proceeding ? 'Saving…' : 'Checkout')}{!blockedLabel && !proceeding && <ArrowRight />}</Button>;

  return <CustomerLayout><main className="order-experience order-enter mx-auto w-full max-w-6xl px-4 sm:px-8 pb-36 lg:pb-16">
    <div className="order-heading"><Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft /></Button><h1>Your cart</h1>{items.length > 0 && <span className="text-muted-foreground text-sm">{items.length} {items.length === 1 ? 'item' : 'items'}</span>}</div>
    {!isCustomer ? <div className="py-20 text-center space-y-5"><ShoppingBag className="mx-auto text-muted-foreground" size={32} /><h2 className="text-xl font-bold">Sign in to continue</h2><Button asChild><Link to="/login">Sign in</Link></Button></div> : !items.length ? <div className="py-20 text-center space-y-5"><ShoppingBag className="mx-auto text-muted-foreground" size={32} /><h2 className="text-xl font-bold">Your cart is empty</h2><Button asChild><Link to="/products">Shop groceries<ArrowRight /></Link></Button></div> : <>
      <div className="order-grid"><div className="min-w-0">
        {freeThreshold > 0 && <div className="flex items-center gap-2 border-b border-border py-4 text-sm">{isFreeDeliveryUnlocked && <Check size={16} />}<span>{isFreeDeliveryUnlocked ? 'Free delivery' : `₹${freeDeliveryGap.toFixed(0)} away from free delivery`}</span></div>}
        {error && <p role="alert" className="order-alert mt-4">{error}</p>}
        {hasOutOfStock && <p className="order-alert mt-4">Remove unavailable items to continue.</p>}
        {isEmergencyPaused && <p className="order-alert mt-4">{storeSettings?.emergency_pause_message || 'Online ordering is temporarily paused.'}</p>}
        {operatingHours.isClosed && <p className="order-alert mt-4">{operatingHours.message}</p>}
        {items.map(item => {
          const stock = item.stock_quantity ?? 999;
          const maxOrder = item.max_order_quantity ?? 0;
          const unavailable = item.is_in_stock === false || stock <= 0;
          const maximum = maxOrder > 0 ? Math.min(stock, maxOrder) : stock;
          const price = parseFloat(item.unit_price || 0);
          return <article key={item.id} className={`order-row ${removingIds.has(item.id) ? 'opacity-0 scale-95 pointer-events-none' : ''}`}>
            {item.product_image ? <img src={item.product_image} alt={item.product_name} /> : <div className="size-14 sm:size-[72px] rounded-lg bg-muted grid place-items-center text-muted-foreground"><ShoppingBag size={24} /></div>}
            <div className="min-w-0"><h2>{item.product_name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.product_unit} <span className="whitespace-nowrap">· ₹{item.unit_price}</span></p>{unavailable && <p className="text-xs text-destructive mt-1">Out of stock</p>}</div>
            <div className="order-row-controls"><div className="order-stepper"><Button variant="ghost" size="icon" onClick={() => handleQuantityChange(item, item.quantity - 1)} disabled={unavailable} aria-label={item.quantity === 1 ? `Remove ${item.product_name}` : `Decrease ${item.product_name}`} title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}>{item.quantity === 1 ? <Trash2 /> : <Minus />}</Button><output aria-label={`${item.product_name} quantity`}>{item.quantity}</output><Button variant="ghost" size="icon" onClick={() => handleQuantityChange(item, item.quantity + 1)} disabled={unavailable || item.quantity >= maximum} aria-label={`Increase ${item.product_name}`} title="Increase quantity"><Plus /></Button></div><div className="text-right min-w-16"><p key={item.quantity} className="font-extrabold tabular-nums order-enter">₹{(price * item.quantity).toFixed(2)}</p>{Number(item.regular_price) > price && <p className="text-xs text-muted-foreground line-through tabular-nums">₹{(Number(item.regular_price) * item.quantity).toFixed(0)}</p>}</div></div>
          </article>;
        })}
        <Button variant="link" asChild className="text-foreground px-0 mt-5"><Link to="/products"><Plus />Add more items</Link></Button>
      </div><aside className="hidden lg:block order-sidebar order-summary"><h3>Your order</h3><Bill /><div className="flex justify-between border-t border-border mt-6 pt-5 mb-6 font-extrabold text-xl"><span>Total</span><span className="tabular-nums">₹{totalPayable.toFixed(2)}</span></div><CheckoutButton className="w-full" /></aside></div>
      <aside className="order-dock lg:hidden">{showBillDrawer && <div id="cart-mobile-bill" className="order-dock-bill"><Bill /></div>}<div className="flex items-center justify-between gap-3"><div className="min-w-0"><Button variant="ghost" className="p-0 h-auto text-xs text-muted-foreground" onClick={() => setShowBillDrawer(value => !value)} aria-expanded={showBillDrawer} aria-controls="cart-mobile-bill">Total<ChevronDown className={showBillDrawer ? 'rotate-180' : ''} /></Button><p className="text-xl font-extrabold tabular-nums">₹{totalPayable.toFixed(2)}</p></div><CheckoutButton className="max-w-[60%]" /></div></aside>
    </>}
  </main></CustomerLayout>;
}
export default CartPage;
