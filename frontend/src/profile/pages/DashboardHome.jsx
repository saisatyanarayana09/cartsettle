import { Link, useNavigate } from '../../router';
import {
  ArrowLeft,
  User,
  Package,
  MapPin,
  Heart,
  Bell,
  MessageSquare,
  HelpCircle,
  LogOut,
  ChevronRight,
  IndianRupee,
  Gift,
  Tag,
  Globe,
  Sliders,
} from 'lucide-react';
import { useCart } from '../../cart-context';
import { useLanguage } from '../../context/LanguageContext';

export default function DashboardHome() {
  const { user, logout } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const cards = [
    {
      name: t('Your Orders'),
      icon: Package,
      path: '/profile/orders',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      name: t('Offers & Promo Codes'),
      icon: Tag,
      path: '/profile/offers',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
    },
    {
      name: t('Digital Wallet'),
      icon: IndianRupee,
      path: '/profile/wallet',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      name: t('Refer & Earn'),
      icon: Gift,
      path: '/profile/refer-and-earn',
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/50',
    },
    {
      name: t('Favorites'),
      icon: Heart,
      path: '/profile/favorites',
      color: 'text-pink-600 dark:text-pink-400',
      bg: 'bg-pink-50 dark:bg-pink-950/50',
    },
    {
      name: t('Saved Addresses'),
      icon: MapPin,
      path: '/profile/addresses',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      name: t('Notifications'),
      icon: Bell,
      path: '/profile/notifications',
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    },
    {
      name: t('Account Settings'),
      icon: User,
      path: '/profile/account',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      name: t('Languages'),
      icon: Globe,
      path: '/profile/language',
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/50',
    },
    {
      name: t('App Settings'),
      icon: Sliders,
      path: '/profile/settings',
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      name: t('Help Center'),
      icon: HelpCircle,
      path: '/profile/help',
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      name: t('Leave Feedback'),
      icon: MessageSquare,
      path: '/profile/feedback',
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
    },
  ];

  const avatarUrl =
    user?.avatar ||
    user?.customer_profile?.avatar ||
    user?.customer_profile?.avatar_url ||
    user?.customer_profile?.profile_picture;

  const initials = (
    user?.first_name
      ? user.first_name.slice(0, 2)
      : user?.username
      ? user.username.slice(0, 2)
      : ''
  ).toUpperCase();

  return (
    <div>
      {/* Minimalist Clean Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs mb-6 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          {/* Avatar + User Info */}
          <div className="flex items-center gap-4">
            <div className="size-14 sm:size-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xl font-black shadow-2xs shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
              ) : (
                initials || <User size={26} aria-label="Account" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                Hi, {user?.first_name || user?.username || 'Customer'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm truncate mt-0.5">
                {user?.email || 'Manage your account and track orders'}
              </p>
            </div>
          </div>

          {/* Header Action Shortcuts */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <ArrowLeft size={14} /> {t('Back to Store')}
            </button>

            <Link
              to="/profile/account"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <span>Edit Profile</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Compact Modern Grid Tiles: Icon on Left, Title Only, Right Chevron, Tactile Spring */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.path}
              className="group flex items-center justify-between h-[64px] px-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${card.bg} ${card.color} transition-transform duration-200 group-hover:scale-105 shadow-2xs`}
                >
                  <Icon size={19} className="stroke-[2.25]" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                  {card.name}
                </span>
              </div>
              <div className="size-7 rounded-full bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 transition-colors ml-2">
                <ChevronRight
                  size={15}
                  className="text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sign Out Button at Bottom */}
      <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-center">
        <button
          onClick={handleLogout}
          className="cursor-pointer flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:text-rose-700 transition-all font-bold text-sm shadow-sm border border-rose-200/70 dark:border-rose-900/60 active:scale-95"
        >
          <LogOut size={16} /> {t('Sign Out')}
        </button>
      </div>
    </div>
  );
}
