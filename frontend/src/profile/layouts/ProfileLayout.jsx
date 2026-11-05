import { Outlet, Link, useLocation } from '../../router';
import { ChevronLeft } from 'lucide-react';
import { useCart } from '../../cart-context';
import { CustomerLayout } from '../../customer-layout';

export default function ProfileLayout() {
  const { isCustomer } = useCart();
  const location = useLocation();
  const isRootProfile = location.pathname === '/profile' || location.pathname === '/profile/';
  const isOrdersPage = location.pathname.startsWith('/profile/orders');

  if (!isCustomer) return null;

  return (
    <CustomerLayout>
      <main
        className={`mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 ${
          isOrdersPage
            ? 'py-2.5 sm:py-3.5 pb-20 md:pb-6 bg-[#F5F5F7] dark:bg-black min-h-[calc(100dvh-64px)]'
            : 'py-6 pb-28 md:pb-12'
        }`}
      >
        {!isRootProfile && !isOrdersPage && (
          <div className="mb-3.5">
            <Link
              to="/profile"
              className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700"
            >
              <ChevronLeft size={16} /> Back to Profile
            </Link>
          </div>
        )}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Outlet />
        </div>
      </main>
    </CustomerLayout>
  );
}
