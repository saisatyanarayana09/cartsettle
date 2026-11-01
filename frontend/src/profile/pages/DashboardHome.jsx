import { Link, useNavigate } from 'react-router-dom';
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
      desc: t('Your Orders Desc'),
      icon: Package,
      path: '/profile/orders',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      name: t('Offers & Promo Codes'),
      desc: t('Offers & Promo Codes Desc'),
      icon: Tag,
      path: '/profile/offers',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      name: t('Digital Wallet'),
      desc: t('Digital Wallet Desc'),
      icon: IndianRupee,
      path: '/profile/wallet',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      name: t('Refer & Earn'),
      desc: t('Refer & Earn Desc'),
      icon: Gift,
      path: '/profile/refer-and-earn',
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      name: t('Favorites'),
      desc: t('Favorites Desc'),
      icon: Heart,
      path: '/profile/favorites',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      name: t('Saved Addresses'),
      desc: t('Saved Addresses Desc'),
      icon: MapPin,
      path: '/profile/addresses',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      name: t('Notifications'),
      desc: t('Notifications Desc'),
      icon: Bell,
      path: '/profile/notifications',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      name: t('Account Settings'),
      desc: t('Account Settings Desc'),
      icon: User,
      path: '/profile/account',
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      name: t('Languages'),
      desc: t('Languages Desc'),
      icon: Globe,
      path: '/profile/language',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      name: t('App Settings'),
      desc: t('App Settings Desc'),
      icon: Sliders,
      path: '/profile/settings',
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      name: t('Help Center'),
      desc: t('Help Center Desc'),
      icon: HelpCircle,
      path: '/profile/help',
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      name: t('Leave Feedback'),
      desc: t('Feedback Desc'),
      icon: MessageSquare,
      path: '/profile/feedback',
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
  ];

  const avatarUrl = user?.avatar || user?.customer_profile?.avatar || user?.customer_profile?.avatar_url || user?.customer_profile?.profile_picture;
  const completion = user?.profile_completion?.percentage ?? (user?.customer_profile?.dob ? 100 : 80);
  const isComplete = completion === 100;

  const initials = (
    user?.first_name
      ? user.first_name.slice(0, 2)
      : user?.username
      ? user.username.slice(0, 2)
      : 'NK'
  ).toUpperCase();

  return (
    <div>
      {/* Customer Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 p-6 sm:p-8 text-white shadow-lg mb-8">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          {!isComplete ? (
            <div className="relative size-16 sm:size-20 flex items-center justify-center shrink-0">
              <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="4"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * completion) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="size-12 sm:size-14 rounded-full bg-white text-emerald-900 flex items-center justify-center text-lg sm:text-xl font-black shadow-md overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-xs border border-white">
                {completion}%
              </div>
            </div>
          ) : (
            <div className="size-14 sm:size-16 rounded-full bg-white text-emerald-900 flex items-center justify-center text-xl sm:text-2xl font-black shadow-md shrink-0 overflow-hidden border-2 border-white/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold mb-2 transition-colors cursor-pointer w-fit"
            >
              <ArrowLeft size={14} /> {t('Back to Store')}
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
              Hi, {user?.first_name || user?.username || 'Customer'}
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-0.5 truncate">
              {user?.email || 'Manage your account and track orders'}
            </p>
            {!isComplete && (
              <Link to="/profile/account" className="inline-block text-emerald-200 hover:text-white text-xs underline mt-1 transition-colors">
                Add date of birth to reach 100%
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Action Cards: Symbol on Left, Text on Right, Decreased Height */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.path}
              className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden"
            >
              <div className="flex items-center gap-3.5 relative z-10 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg} ${card.color} transition-transform duration-200 group-hover:scale-105 shadow-inner`}
                >
                  <Icon size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors truncate">
                    {card.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                    {card.desc}
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-50 dark:group-hover:bg-primary-950/50 transition-colors ml-2">
                <ChevronRight
                  size={16}
                  className="text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors translate-x-0 group-hover:translate-x-0.5"
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
