import { Link } from 'react-router-dom';
import { ChevronRight, Globe, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    {
      code: 'en',
      name: 'English (India)',
      nativeName: 'English',
      flag: '🇬🇧',
      desc: 'Browse items, place orders, and receive updates in English.',
      sample: 'Enjoy fresh vegetables & groceries delivered to your doorstep.',
    },
    {
      code: 'te',
      name: 'తెలుగు (India)',
      nativeName: 'Telugu',
      flag: '🇮🇳',
      desc: 'కిరాణా సరుకులు, ఆర్డర్లు మరియు అప్‌డేట్‌లను తెలుగులో పొందండి.',
      sample: 'తాజా కూరగాయలు మరియు కిరాణా సామాగ్రిని మీ ఇంటి వద్దకే వేగంగా పొందండి.',
    },
  ];

  const handleSelectLanguage = (code) => {
    if (code !== language) {
      setLanguage(code);
      toast.success(t('Language Updated'));
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
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
            <Globe size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('Language Settings')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('Language Settings Subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Language Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {languages.map((item) => {
          const isSelected = language === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelectLanguage(item.code)}
              className={`cursor-pointer text-left p-6 rounded-3xl border-2 transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-primary-600 bg-primary-50/40 dark:bg-slate-800 shadow-md ring-2 ring-primary-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              {isSelected && (
                <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-sm">
                  <Check size={16} strokeWidth={3} />
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl" role="img" aria-label={item.name}>
                    {item.flag}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {item.name}
                    </h3>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {item.nativeName}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Preview</span>
                </div>
                <p className="text-xs italic text-slate-500 dark:text-slate-400 line-clamp-2">
                  "{item.sample}"
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
