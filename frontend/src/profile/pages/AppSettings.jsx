import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sun, Moon, Check, Sliders, Activity, Smartphone, Globe } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AppSettings() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, changeLanguage, t } = useLanguage();
  const [vibrationOn, setVibrationOn] = useState(() => {
    try {
      return localStorage.getItem('sk_vibration_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleVibration = () => {
    const nextVal = !vibrationOn;
    setVibrationOn(nextVal);
    try {
      localStorage.setItem('sk_vibration_enabled', nextVal ? 'true' : 'false');
    } catch {
      // ignore
    }
    if (nextVal && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <Link
          to="/profile"
          className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-3"
        >
          <ChevronRight className="rotate-180" size={16} />
          {t('Back to Dashboard')}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center">
            <Sliders size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('App Settings Title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('App Settings Subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
            <Sun size={18} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {t('Appearance')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('Appearance Subtitle')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Mode Option */}
          <button
            type="button"
            onClick={() => toggleTheme('light')}
            className={`cursor-pointer text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative overflow-hidden ${
              theme === 'light'
                ? 'border-primary-600 bg-primary-50/40 dark:bg-slate-800 shadow-sm ring-2 ring-primary-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                theme === 'light'
                  ? 'bg-amber-100 text-amber-600 shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Sun size={24} />
            </div>
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Light Mode')}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('Light Mode Desc')}
              </p>
            </div>
            {theme === 'light' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-sm">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </button>

          {/* Dark Mode Option */}
          <button
            type="button"
            onClick={() => toggleTheme('dark')}
            className={`cursor-pointer text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative overflow-hidden ${
              theme === 'dark'
                ? 'border-primary-500 bg-slate-800/80 dark:bg-slate-800 shadow-sm ring-2 ring-primary-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                theme === 'dark'
                  ? 'bg-indigo-900/60 text-indigo-400 shadow-inner'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Moon size={24} />
            </div>
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Dark Mode')}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('Dark Mode Desc')}
              </p>
            </div>
            {theme === 'dark' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-sm">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Language Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Globe size={18} />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {t('Languages') || 'Language / భాష'}
            </h2>
          </div>
          <Link
            to="/profile/language"
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
          >
            All details →
          </Link>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('Languages Desc') || 'Choose your preferred language for the storefront.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* English */}
          <button
            type="button"
            onClick={() => {
              if (changeLanguage) changeLanguage('en');
              else if (setLanguage) setLanguage('en');
            }}
            className={`cursor-pointer text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative overflow-hidden ${
              language !== 'te'
                ? 'border-primary-600 bg-primary-50/40 dark:bg-slate-800 shadow-sm ring-2 ring-primary-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-slate-100 dark:bg-slate-800">
              🇬🇧
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                English (India)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Browse products, cart, and orders in English
              </p>
            </div>
            {language !== 'te' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-sm">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </button>

          {/* Telugu */}
          <button
            type="button"
            onClick={() => {
              if (changeLanguage) changeLanguage('te');
              else if (setLanguage) setLanguage('te');
            }}
            className={`cursor-pointer text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative overflow-hidden ${
              language === 'te'
                ? 'border-primary-600 bg-primary-50/40 dark:bg-slate-800 shadow-sm ring-2 ring-primary-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-slate-100 dark:bg-slate-800">
              🇮🇳
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                తెలుగు (India)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                కిరాణా సరుకులు మరియు అప్‌డేట్‌లను తెలుగులో పొందండి
              </p>
            </div>
            {language === 'te' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-sm">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Haptic Feedback & Vibration Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Activity size={18} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Haptic Feedback & Vibration
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
          Toggle gentle vibration feedback on touch interactions and button taps on supported devices.
        </p>

        <div
          onClick={handleToggleVibration}
          className={`cursor-pointer p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between gap-4 ${
            vibrationOn
              ? 'border-emerald-500 bg-emerald-50/20 dark:bg-slate-800 shadow-sm ring-2 ring-emerald-500/10'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                vibrationOn
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Smartphone size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {vibrationOn ? 'Vibration Enabled' : 'Vibration Disabled'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {vibrationOn ? 'Vibrate on tap and cart actions' : 'Touch interactions are silent'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div
            className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
              vibrationOn ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                vibrationOn ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
