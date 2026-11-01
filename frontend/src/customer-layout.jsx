import { optimizeImage } from './utils/image';
import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Home, Search, ShoppingBasket, ShoppingCart, User, X, Heart, Bell, LayoutGrid, Trash2, ShoppingBag, Leaf, Coffee, Package, Mic, Volume2, Megaphone, Sparkles, Clock, Wrench, AlertTriangle, Loader2, SearchX, ArrowUpRight } from 'lucide-react'
import { useCart } from './cart-context'
import { useLanguage } from './context/LanguageContext'
import { useSpeechRecognition, useTextToSpeech } from './hooks/useVoice'
import api from './services/api'

function GlobalSearchBar({ settings, onActiveChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const { language } = useLanguage();

  useEffect(() => {
    onActiveChange?.(Boolean(isOpen || isFocused));
  }, [isOpen, isFocused, onActiveChange]);

  const popularKeywords = React.useMemo(() => {
    if (settings?.popular_searches) {
      const parsed = settings.popular_searches
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);
      if (parsed.length > 0) return parsed.slice(0, 6);
    }
    return ["Milk", "Atta", "Rice", "Sugar", "Cooking Oil", "Dal"];
  }, [settings?.popular_searches]);

  // Dynamic Animated Placeholders
  const placeholders = React.useMemo(() => {
    if (settings?.popular_searches) {
      const parsed = settings.popular_searches
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);
      if (parsed.length > 0) {
        return parsed.map(s => `Search '${s}'...`);
      }
    }
    return ["Search products...", "Search for milk...", "Search for atta..."];
  }, [settings?.popular_searches]);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Text-to-Speech Voice Hook
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  // Speech-to-Text Voice Hook
  const { 
    isListening, 
    interimTranscript, 
    error: voiceError, 
    setError: setVoiceError, 
    toggleListening 
  } = useSpeechRecognition({
    onResult: (finalText) => {
      setQuery(finalText);
    },
    onFinal: (finalText) => {
      setQuery(finalText);
      setIsOpen(false);
      navigate(`/products?search=${encodeURIComponent(finalText)}`);
    },
    lang: language === 'te' ? 'te-IN' : 'en-IN',
  });

  useEffect(() => {
    if (isListening || query.length > 0) return;
    
    const currentWord = placeholders[placeholderIndex];
    let typingSpeed = isDeleting ? 30 : 60;
    
    let timeout;
    
    if (!isDeleting && typewriterText === currentWord) {
      typingSpeed = 2500; // Pause at the end
      timeout = setTimeout(() => setIsDeleting(true), typingSpeed);
    } else if (isDeleting && typewriterText === "") {
      setIsDeleting(false);
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    } else {
      timeout = setTimeout(() => {
        setTypewriterText((prev) => 
          isDeleting 
            ? prev.slice(0, -1) 
            : currentWord.slice(0, prev.length + 1)
        );
      }, typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [typewriterText, isDeleting, placeholderIndex, placeholders, isListening, query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Display value combines committed query + live interim voice speech
  const displayValue = isListening && interimTranscript 
    ? interimTranscript
    : query;

  useEffect(() => {
    const controller = new AbortController();
    const effectiveQuery = displayValue.trim();

    const timer = setTimeout(() => {
      if (effectiveQuery.length > 1) {
        setLoading(true);
        api.get(`/products/?search=${encodeURIComponent(effectiveQuery)}`, { signal: controller.signal })
          .then(res => {
            setResults(res.data.results?.slice(0, 5) || res.data?.slice(0, 5) || []);
            setIsOpen(true);
          })
          .catch((err) => { if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') console.error(err); })
          .finally(() => setLoading(false));
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [displayValue]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [displayValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetQuery = displayValue.trim();
    if (targetQuery) {
      setIsOpen(false);
      navigate(`/products?search=${encodeURIComponent(targetQuery)}`);
    }
  };

  const handleVoiceToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
      setTimeout(() => {
        toggleListening();
      }, 150);
    } else {
      toggleListening();
    }
  };

  const handleReadAloud = (e) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopSpeaking();
    } else if (displayValue.trim()) {
      speak(displayValue.trim());
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit} className={`relative flex items-center w-full bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl sm:rounded-2xl border transition-all duration-300 shadow-xs ${
        isListening
          ? 'border-rose-500 ring-4 ring-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20'
          : 'border-slate-200/80 dark:border-slate-700/80 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:shadow-md'
      }`}>
        <div className={`pl-3 sm:pl-3.5 transition-colors shrink-0 ${isListening ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
          <Search size={18} />
        </div>

        <input 
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (isListening) toggleListening();
          }}
          onFocus={() => {
            setIsFocused(true);
            if (results.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
            } else if (e.key === 'Enter') {
              if (selectedIndex >= 0 && results[selectedIndex]) {
                e.preventDefault();
                setIsOpen(false);
                navigate(`/product/${results[selectedIndex].id}`);
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
              setIsFocused(false);
            }
          }}
          placeholder={isListening ? "Listening... Speak now" : (typewriterText || "Search rice, dal, snacks...")}
          className={`w-full bg-transparent pl-2.5 sm:pl-3 ${
            displayValue.trim().length > 0 ? 'pr-16 sm:pr-24' : 'pr-10 sm:pr-12'
          } py-2 sm:py-2.5 outline-none text-xs sm:text-sm text-slate-900 dark:text-white font-medium ${
            isListening ? 'placeholder:text-rose-500 placeholder:font-medium' : 'placeholder:text-slate-400'
          }`}
        />

        {/* Right-Hand Button Controls Group positioned cleanly inside Search Bar */}
        <div className="absolute right-1.5 sm:right-2 flex items-center gap-0.5 sm:gap-1">
          {/* Active Search Loading Spinner */}
          {loading && (
            <div className="p-1 text-emerald-600 dark:text-emerald-400 animate-spin">
              <Loader2 size={15} />
            </div>
          )}

          {/* Read Aloud Text-to-Speech Button (Desktop/Tablet) */}
          {displayValue.trim().length > 0 && !isListening && (
            <button
              type="button"
              onClick={handleReadAloud}
              title={isSpeaking ? "Stop speech" : "Read aloud"}
              className={`hidden sm:inline-flex p-1.5 rounded-lg transition-all ${
                isSpeaking 
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 animate-pulse' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              {isSpeaking ? <Volume2 size={15} className="text-emerald-600 animate-bounce" /> : <Volume2 size={15} />}
            </button>
          )}

          {/* Clear Input Button */}
          {displayValue.length > 0 && !isListening && (
            <button 
              type="button" 
              onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} 
              className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}

          {/* Speech-to-Text Microphone Button inside Right Edge */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            title={isListening ? "Listening... Click to stop" : "Search by voice"}
            className={`relative p-1.5 rounded-lg transition-all flex items-center justify-center ${
              isListening
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105'
                : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-lg bg-rose-400 animate-ping opacity-75" />
            )}
            <Mic size={16} className={`relative z-10 ${isListening ? 'text-white animate-pulse' : ''}`} />
          </button>
        </div>
      </form>

      {/* Real-time Voice Status Bar */}
      {isListening && (
        <div className="absolute top-full left-0 right-0 mt-1 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center justify-between shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="truncate">{interimTranscript ? `"${interimTranscript}"` : "Listening... Speak your item (e.g. Sugar, Dal, Oil)"}</span>
          </div>
          <button 
            type="button" 
            onClick={toggleListening}
            className="text-[11px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded font-bold ml-2 shrink-0"
          >
            Done
          </button>
        </div>
      )}

      {/* Voice Error Notice */}
      {voiceError && (
        <div className="absolute top-full left-0 right-0 mt-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg text-xs flex items-center justify-between shadow-lg z-50">
          <span className="truncate">{voiceError}</span>
          <button type="button" onClick={() => setVoiceError(null)} className="font-bold ml-2 text-amber-600 hover:text-amber-800">✕</button>
        </div>
      )}

      {/* Popular Searches Dropdown on Focus (when query is empty) */}
      {isFocused && displayValue.trim().length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-50 p-3.5 sm:p-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Popular Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularKeywords.map((keyword, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuery(keyword);
                  navigate(`/products?search=${encodeURIComponent(keyword)}`);
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 transition-all border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-800 cursor-pointer active:scale-95"
              >
                <span>{keyword}</span>
                <ArrowUpRight size={12} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {isOpen && displayValue.trim().length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-50 max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((skeletonIdx) => (
                <div key={skeletonIdx} className="flex items-center gap-3 p-2.5 rounded-xl animate-pulse">
                  <div className="size-11 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/5" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/4" />
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-14 shrink-0" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div>
              {results.map((product, idx) => (
                <Link 
                  key={product.id} 
                  to={`/product/${product.id}`}
                  onClick={() => { setIsOpen(false); setQuery(''); }}
                  className={`flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors ${
                    selectedIndex === idx ? 'bg-emerald-50/70 dark:bg-emerald-950/40' : ''
                  }`}
                >
                  <div className="size-11 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-400 text-xs border border-slate-200/50 dark:border-slate-700/50">
                    {product.image ? (
                      <img loading="lazy" decoding="async" src={optimizeImage(product.image, 100)} className="size-full object-cover" alt="" />
                    ) : (
                      product.name?.charAt(0)?.toUpperCase() || 'P'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{product.unit}</p>
                  </div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    ₹{product.offer_price || product.regular_price}
                  </div>
                </Link>
              ))}
              <button 
                onClick={handleSubmit} 
                className="w-full p-3 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-center transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View all results for "{displayValue}"</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <SearchX size={22} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No products found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                We could not find items matching "{displayValue}". Try searching for daily essentials below.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-3.5">
                {popularKeywords.slice(0, 4).map((keyword, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuery(keyword);
                      navigate(`/products?search=${encodeURIComponent(keyword)}`);
                      setIsOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 transition-colors border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NotificationPopup({ isOpen, onClose }) {
  const { notifications, refresh, notificationPermission, requestWebPushPermission } = useCart();
  const wrapperRef = useRef(null);

  useEffect(() => {
  const handleClickOutside = (event) => {
  if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
  onClose();
  }
  };
  if (isOpen) {
  document.addEventListener('mousedown', handleClickOutside);
  }
  return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const deleteNotification = async (id) => {
  try {
  await api.delete(`/notifications/${id}/`);
  refresh();
  } catch (err) {
  console.error(err);
  }
  };

  if (!isOpen) return null;

  return (
   <div ref={wrapperRef} className="absolute right-0 top-14 w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-slate-900/5 dark:ring-slate-800 border border-slate-100 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[80vh] transition-all">
   <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
   <h3 className="font-extrabold text-slate-900 dark:text-white">Notifications</h3>
   <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X size={18}/></button>
   </div>

   {notificationPermission !== 'granted' && (
     <div className="p-3 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-2.5">
       <div className="flex items-center gap-2">
         <Bell size={16} className="text-emerald-500 shrink-0" />
         <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold">Instant Order Push Alerts</p>
       </div>
       <button
         onClick={requestWebPushPermission}
         className="px-2.5 py-1 text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition active:scale-95 cursor-pointer shrink-0"
       >
         Enable
       </button>
     </div>
   )}
  <div className="overflow-y-auto p-4 space-y-3">
  {(!notifications || notifications.length === 0) ? (
  <div className="text-center py-6">
  <div className="size-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-3">
  <Bell size={22} />
  </div>
  <p className="text-sm font-bold text-slate-900 dark:text-white">You're all caught up!</p>
  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No new notifications.</p>
  </div>
  ) : (
  notifications.map(n => (
  <div key={n.id} className={`p-3 rounded-xl border ${n.is_read ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 ' : 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 '}`}>
  <div className="flex justify-between items-start mb-1">
  <h4 className={`text-sm font-bold ${n.is_read ? 'text-slate-900 dark:text-slate-100 ' : 'text-emerald-900 dark:text-emerald-300 '}`}>{n.title}</h4>
  <div className="flex items-center gap-2">
  <span className="text-[10px] font-medium text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
  <button onClick={() => deleteNotification(n.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={14}/></button>
  </div>
  </div>
  <p className={`text-xs ${n.is_read ? 'text-slate-500 dark:text-slate-400 ' : 'text-emerald-700 dark:text-emerald-300 '}`}>{n.message}</p>
  </div>
  ))
  )}
  </div>
  <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center">
  <Link to="/notifications" onClick={onClose} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">Manage notifications</Link>
  </div>
  </div>
 );
}

// Module-level in-memory flag that survives route transitions in the current tab session
let hasShownWelcomeScreenInSession = false;

function isWelcomeAlreadyShown() {
  if (hasShownWelcomeScreenInSession) return true;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (window.sessionStorage.getItem('welcome_screen_shown_in_session') === 'true') {
        hasShownWelcomeScreenInSession = true;
        return true;
      }
    }
  } catch {
    // Storage restricted or blocked (e.g. private browsing)
  }
  return false;
}

function markWelcomeAsShown() {
  hasShownWelcomeScreenInSession = true;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('welcome_screen_shown_in_session', 'true');
    }
  } catch {
    // Storage restricted or blocked
  }
}

function WelcomeScreen() {
  const { user } = useCart();
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false;

    // 1. If already shown in this tab session (in-memory or sessionStorage), DO NOT show again
    if (isWelcomeAlreadyShown()) {
      return false;
    }

    // 2. Check URL parameter explicitly (e.g. ?welcome=true or ?welcome=1)
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('welcome') === '1' || params.get('welcome') === 'true') {
        markWelcomeAsShown();
        return true;
      }
    } catch {}

    // 3. NEVER show the welcome splash on product, cart, checkout, or subpages!
    const pathname = window.location.pathname || '';
    const isRootHome = pathname === '/' || pathname === '';
    if (!isRootHome) {
      // Mark as shown so navigating to '/' later doesn't randomly pop it up
      markWelcomeAsShown();
      return false;
    }

    // 4. On initial visit to the root Home Page ('/'), show once and mark immediately
    markWelcomeAsShown();
    return true;
  });
  const [stage, setStage] = useState('initial');

  useEffect(() => {
    if (show) {
      markWelcomeAsShown();
      const timer1 = setTimeout(() => setStage('fade-in'), 50); 
      const timer2 = setTimeout(() => setStage('fade-out'), 2000); 
      const timer3 = setTimeout(() => { setShow(false); setStage('hidden'); }, 2600);
      
      return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
    }
  }, [show]);

  // Listen for explicit manual triggers (e.g. login) ONLY if on the homepage
  useEffect(() => {
    const handleTrigger = () => {
      const pathname = window.location.pathname || '';
      if (pathname === '/' || pathname === '') {
        markWelcomeAsShown();
        setShow(true);
        setStage('initial');
      }
    };
    window.addEventListener('trigger-welcome-screen', handleTrigger);
    return () => window.removeEventListener('trigger-welcome-screen', handleTrigger);
  }, []);

  if (!show || stage === 'hidden') return null;

  const hour = new Date().getHours();
  let greeting = "Welcome";
  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17 && hour < 22) {
    greeting = "Good evening";
  }

  // Get user name from context or cached localStorage for instant display
  const cachedUserStr = typeof window !== 'undefined' ? localStorage.getItem('smart-kirana-customer-user') : null;
  let cachedName = '';
  try {
    const cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
    cachedName = cachedUser?.first_name || cachedUser?.username || '';
  } catch {
    cachedName = '';
  }
  const name = user?.first_name || user?.username || cachedName;

  const handleSkip = () => {
    setStage('fade-out');
    setTimeout(() => { setShow(false); setStage('hidden'); }, 300);
  };

  return (
    <div
      onClick={handleSkip}
      role="button"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-white via-white to-emerald-50 dark:from-[#090d16] dark:via-[#0c1220] dark:to-[#0f1b2b] transition-opacity duration-700 ease-in-out ${
        stage === 'fade-out' || stage === 'hidden' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } overflow-hidden cursor-pointer`}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full border border-emerald-200/10 absolute" />
        <div className="w-72 h-72 rounded-full border border-emerald-300/10 absolute" />
        <div className="w-48 h-48 rounded-full bg-emerald-400/5 absolute" />
      </div>
      <div className="absolute top-[15%] left-[10%] text-2xl opacity-[0.06] animate-bounce" style={{ animationDuration: '3s' }}>🥬</div>
      <div className="absolute top-[20%] right-[12%] text-xl opacity-[0.06] animate-bounce" style={{ animationDuration: '3.5s' }}>🛒</div>
      <div className="absolute bottom-[20%] left-[15%] text-xl opacity-[0.06] animate-bounce" style={{ animationDuration: '4s' }}>🥕</div>
      <div className="absolute bottom-[15%] right-[10%] text-2xl opacity-[0.06] animate-bounce" style={{ animationDuration: '2.5s' }}>🌿</div>

      <div
        className={`flex flex-col items-center justify-center relative z-10 transition-[opacity,transform] duration-700 ease-out transform ${
          stage === 'fade-in' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        <div className="flex flex-col items-center justify-center mb-10 relative">
          <div className="absolute w-40 h-40 sm:w-48 sm:h-48 bg-emerald-400/10 rounded-full blur-3xl" />
          <img src="/logo-transparent.png" className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain mb-4 drop-shadow-xl relative z-10" alt="Logo" />
          <div className="text-base sm:text-lg font-black tracking-[0.25em] uppercase text-slate-500 drop-shadow-sm text-center ml-2 relative z-10">
            <span className="text-emerald-900 dark:text-emerald-300">Narendra</span> <span className="text-primary-600 dark:text-primary-400">Kirana</span>
          </div>
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight text-center px-6 leading-tight">
          {name ? (
            <>
              {greeting},<br className="sm:hidden" /> {name}.
            </>
          ) : (
            <>
              {greeting} to<br className="sm:hidden" /> Narendra Kirana
            </>
          )}
        </h1>
      </div>
      <p className={`absolute bottom-8 text-sm text-slate-300 dark:text-slate-500 transition-opacity duration-700 ${stage === 'fade-in' ? 'opacity-100' : 'opacity-0'}`}>
        Click anywhere to skip
      </p>
    </div>
  );
}

function TopAnnouncementMarquee({ settings }) {
  if (!settings?.enable_announcement_bar || !settings?.announcement_text) {
    return null;
  }

  // Active date range check if provided
  const now = new Date();
  if (settings.announcement_start_date) {
    const start = new Date(settings.announcement_start_date);
    if (!isNaN(start.getTime()) && now < start) return null;
  }
  if (settings.announcement_end_date) {
    const end = new Date(settings.announcement_end_date);
    if (!isNaN(end.getTime()) && now > end) return null;
  }

  const bgColor = settings.announcement_bg_color || '#16a34a';
  const textColor = settings.announcement_text_color || '#ffffff';

  return (
    <div
      className="relative w-full overflow-hidden py-2 px-4 text-xs sm:text-sm font-bold tracking-wide z-40 select-none shadow-xs border-b border-black/10"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex w-max animate-marquee space-x-12 items-center">
        {[0, 1, 2, 3].map((idx) => (
          <span key={idx} className="flex items-center gap-3 whitespace-nowrap">
            <Megaphone size={15} className="shrink-0 opacity-90 animate-bounce" />
            <span>{settings.announcement_text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

let hasSeenFestivePopupInSession = false;

function FestivePopupModal({ settings }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (settings?.enable_festive_popup) {
      if (hasSeenFestivePopupInSession) return;
      
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      // Only pop up on homepage or main catalog, never on product detail, cart, or checkout
      if (pathname !== '/' && pathname !== '' && pathname !== '/products') {
        return;
      }

      let seen = false;
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          seen = window.sessionStorage.getItem('festive_popup_seen') === 'true';
        }
      } catch {}

      if (!seen) {
        const timer = setTimeout(() => setIsOpen(true), 600);
        return () => clearTimeout(timer);
      }
    }
  }, [settings?.enable_festive_popup]);

  if (!isOpen) return null;

  const handleClose = () => {
    hasSeenFestivePopupInSession = true;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('festive_popup_seen', 'true');
      }
    } catch {}
    setIsOpen(false);
  };

  const title = settings.festive_popup_title || 'Special Festive Offers! 🎉';
  const content = settings.festive_popup_content || 'Celebrate the festival season with exclusive store savings and specials!';
  const image = settings.festive_popup_image;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0f172a] rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-200/60 dark:border-amber-500/20 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 cursor-pointer"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {image ? (
          <div className="mb-4 rounded-2xl overflow-hidden max-h-48 border border-slate-100 dark:border-slate-800 shadow-sm">
            <img loading="lazy" decoding="async" src={image} alt={title} className="w-full h-full max-h-48 object-cover" />
          </div>
        ) : (
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-amber-400 to-rose-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25">
            <Sparkles size={32} className="animate-pulse" />
          </div>
        )}

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {title}
        </h3>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          {content}
        </p>

        <div className="flex flex-col gap-2.5">
          <Link
            to="/products"
            onClick={handleClose}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-600 hover:opacity-95 active:scale-95 text-white font-black text-base shadow-lg shadow-rose-500/25 transition-all text-center cursor-pointer"
          >
            ✨ Shop Now
          </Link>
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function WhatsAppSupportWidget({ settings }) {
  if (!settings?.enable_whatsapp_support || !settings?.whatsapp_number) {
    return null;
  }

  const isCartPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/cart');
  const rawNumber = String(settings.whatsapp_number).replace(/\D/g, '');
  const cleanNumber = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;
  const defaultMessage = settings.whatsapp_default_message || `Hello ${settings.store_name || 'Smart Kirana'}, I would like to inquire about my order.`;
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <aside aria-label="Support Widget">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className={`fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 ${isCartPage ? 'hidden md:flex' : 'flex'} items-center gap-2 group cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95`}
      >
        <div className="hidden md:flex items-center px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-lg text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1.5" />
          WhatsApp Support
        </div>
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 ring-4 ring-emerald-500/20 group-hover:ring-emerald-500/40 transition-all">
          <svg
            className="w-7 h-7 sm:w-8 sm:h-8 fill-current"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
      </a>
    </aside>
  );
}

function MaintenanceModeOverlay({ settings }) {
  const message = settings?.maintenance_message || "We are currently performing scheduled system maintenance and upgrades to improve your shopping experience. Please check back shortly.";
  const estimatedTime = settings?.maintenance_estimated_time || settings?.estimated_maintenance_time || settings?.maintenance_until;

  return (
    <div className="fixed inset-0 z-[99999] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center p-6 text-center text-white select-none overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center my-auto">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
          <img
            loading="lazy"
            decoding="async"
            src={settings?.store_logo || "/logo-transparent.png"}
            alt={settings?.store_name || "Store Logo"}
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-2xl relative z-10"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-black uppercase tracking-wider mb-4">
          <Wrench size={14} className="animate-spin" style={{ animationDuration: '8s' }} />
          <span>Under Scheduled Maintenance</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
          {settings?.store_name ? `${settings.store_name} Under Maintenance` : "Store Under Scheduled Maintenance"}
        </h1>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-medium">
          {message}
        </p>

        {estimatedTime && (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs sm:text-sm font-bold text-amber-300 mb-8 shadow-inner">
            <Clock size={16} />
            <span>Estimated Resumption: {estimatedTime}</span>
          </div>
        )}

        {(settings?.store_phone || settings?.store_email) && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 w-full max-w-sm space-y-1.5 mb-6 text-left">
            <p className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Need urgent assistance?</p>
            {settings.store_phone && <p>📞 Phone: <span className="text-slate-200 font-semibold">{settings.store_phone}</span></p>}
            {settings.store_email && <p>✉️ Email: <span className="text-slate-200 font-semibold">{settings.store_email}</span></p>}
          </div>
        )}

        <a
          href="/owner/login"
          className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
        >
          Staff & Owner Sign In
        </a>
      </div>
    </div>
  );
}

export function CustomerLayout({ children }) {
  const { cart, isCustomer, notifications, storeSettings: contextSettings, user } = useCart()
  const [storeSettings, setStoreSettings] = useState(contextSettings)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isMobileSearchHidden, setIsMobileSearchHidden] = useState(false)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const location = useLocation();

  useEffect(() => {
    // Only auto-collapse searchbar on the customer home page
    if (location.pathname !== '/') {
      setIsMobileSearchHidden(false);
      return;
    }

    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // If at or near top of the page, searchbar is always visible
          if (currentScrollY <= 25) {
            setIsMobileSearchHidden(false);
          } else if (!isSearchActive) {
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
              // Scrolling down (user swiping up) - hide searchbar like mobile app
              setIsMobileSearchHidden(true);
            } else if (currentScrollY < lastScrollY - 12) {
              // Scrolling up (user swiping down towards top) - reveal searchbar
              setIsMobileSearchHidden(false);
            }
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname, isSearchActive]);

  useEffect(() => {
    if (contextSettings) {
      setStoreSettings(contextSettings);
    } else {
      api.get('/store/settings/').then(res => setStoreSettings(res.data)).catch(console.error);
    }
  }, [contextSettings]);

  // Check if current user is owner or staff
  const isStaffOrOwner = Boolean(
    user?.is_owner || 
    user?.is_staff || 
    user?.is_superuser ||
    (() => {
      try {
        const ownerUser = JSON.parse(localStorage.getItem('smart-kirana-owner-user') || 'null');
        return Boolean(ownerUser?.is_owner || ownerUser?.is_staff || ownerUser?.is_superuser);
      } catch {
        return false;
      }
    })()
  );

  // Store Maintenance Mode screen blocker
  if (storeSettings?.is_maintenance_mode && !isStaffOrOwner) {
    return <MaintenanceModeOverlay settings={storeSettings} />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-vacation-cream,#f7f5f0)] dark:bg-[#090d16] flex flex-col justify-start text-[var(--color-vacation-charcoal,#323232)] dark:text-slate-100 transition-colors duration-200 antialiased pb-20 md:pb-0">
      <TopAnnouncementMarquee settings={storeSettings} />
      <WelcomeScreen />
      <FestivePopupModal settings={storeSettings} />
      <WhatsAppSupportWidget settings={storeSettings} />

      {/* Customer Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-xl shadow-xs transition-colors duration-200">
        <div className={`mx-auto flex flex-col sm:flex-row w-full sm:items-center sm:justify-between px-3.5 sm:px-6 sm:py-3 lg:px-8 xl:px-12 transition-all duration-300 ${
          isMobileSearchHidden ? 'py-2 gap-0 sm:gap-6' : 'py-2.5 gap-2.5 sm:gap-6'
        }`}>
          {/* Top Row on Mobile / Left Group on Desktop */}
          <div className="flex items-center justify-between w-full sm:w-auto shrink-0">
            {/* Brand Logo & Text */}
            <Link to="/" className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tighter whitespace-nowrap shrink-0 drop-shadow-sm hover:opacity-80 transition-opacity">
              <span className="text-slate-800 dark:text-white">Narendra</span>
              <span className="text-emerald-600 dark:text-emerald-400">Kirana</span>
            </Link>

            {/* Mobile-only Notification Bell (Logged-in Customers) */}
            {isCustomer && (
              <div className="relative sm:hidden">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className="grid size-9 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {notifications?.some(n => !n.is_read) && (
                    <span className="absolute right-0 top-0 size-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse"></span>
                  )}
                </button>
                <NotificationPopup isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
              </div>
            )}
          </div>
          
          {/* Center Search Bar - Smooth Auto-Collapse / Expand on Mobile Home Page Scroll */}
          <div className={`w-full sm:flex-1 sm:max-w-2xl sm:mx-2 md:mx-4 transition-all duration-300 ease-in-out origin-top ${
            isMobileSearchHidden
              ? 'max-h-0 opacity-0 -translate-y-2 pointer-events-none overflow-hidden sm:max-h-none sm:opacity-100 sm:translate-y-0 sm:pointer-events-auto sm:overflow-visible'
              : 'max-h-20 opacity-100 translate-y-0 pointer-events-auto sm:max-h-none'
          }`}>
            <GlobalSearchBar settings={storeSettings} onActiveChange={setIsSearchActive} />
          </div>
        
          {/* Right Controls (Desktop Only - Mobile navigation is handled by bottom bar) */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">
            {isCustomer ? (
              <>
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)} 
                    className="grid size-9 sm:size-10 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition relative cursor-pointer"
                    title="Notifications"
                  >
                    <Bell size={18} />
                    {notifications?.some(n => !n.is_read) && (
                      <span className="absolute right-0 top-0 size-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse"></span>
                    )}
                  </button>
                  <NotificationPopup isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
                </div>
                
                {/* My Account Pill */}
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition ml-1 shadow-xs"
                >
                  {user?.avatar || user?.customer_profile?.avatar || user?.customer_profile?.avatar_url || user?.customer_profile?.profile_picture ? (
                    <img 
                      src={user?.avatar || user?.customer_profile?.avatar || user?.customer_profile?.avatar_url || user?.customer_profile?.profile_picture} 
                      alt="Avatar" 
                      className="size-6 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                    />
                  ) : (
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full p-1">
                      <User size={16} />
                    </div>
                  )}
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 pr-1">My Account</span>
                </Link>
              </>
            ) : (
              <Link to="/login" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1">
                Sign in
              </Link>
            )}

            {/* Previous Rectangular Cart Button with Badge */}
            <Link 
              to="/cart" 
              aria-label="Cart" 
              className="relative flex h-11 w-16 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all ml-2 shadow-sm hover:shadow active:scale-95 group cursor-pointer"
            >
              <ShoppingCart size={20} strokeWidth={2.5} className="mt-0.5" />
              {cart?.items?.length > 0 && (
                <span className="absolute -top-2 -right-2 flex h-[22px] min-w-[22px] px-1.5 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                  {cart.items.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area with Smooth Page Transition */}
      <main className="flex-1 w-full flex flex-col">
        <div
          key={location.pathname}
          className="flex-1 w-full flex flex-col animate-page-fade"
        >
          {children || <Outlet />}
        </div>
      </main>



      {/* 5-Tab Mobile Navigation Bar (strictly mobile & tablet: md:hidden) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-slate-200/80 dark:border-slate-800/90 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl py-2 px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Link 
          to="/" 
          className={`flex flex-1 flex-col items-center justify-center py-1 gap-1 text-[11px] font-bold transition-all ${
            location.pathname === '/' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Home size={20} className={location.pathname === '/' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span>Home</span>
        </Link>

        <Link 
          to="/categories" 
          className={`flex flex-1 flex-col items-center justify-center py-1 gap-1 text-[11px] font-bold transition-all ${
            location.pathname === '/categories' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <LayoutGrid size={20} className={location.pathname === '/categories' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span>Categories</span>
        </Link>

        <Link 
          to={isCustomer ? "/profile/orders" : "/login?redirect=/profile/orders"} 
          className={`flex flex-1 flex-col items-center justify-center py-1 gap-1 text-[11px] font-bold transition-all ${
            location.pathname === '/profile/orders' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Package size={20} className={location.pathname === '/profile/orders' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span>Orders</span>
        </Link>

        <Link 
          to={isCustomer ? "/profile" : "/login"} 
          className={`flex flex-1 flex-col items-center justify-center py-1 gap-1 text-[11px] font-bold transition-all ${
            location.pathname.startsWith('/profile') && location.pathname !== '/profile/orders' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <User size={20} className={location.pathname.startsWith('/profile') && location.pathname !== '/profile/orders' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span>{isCustomer ? 'Profile' : 'Sign in'}</span>
        </Link>

        <Link 
          to="/cart" 
          className={`relative flex flex-1 flex-col items-center justify-center py-1 gap-1 text-[11px] font-bold transition-all ${
            location.pathname === '/cart' ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'
          }`}
        >
          <div className="relative">
            <ShoppingCart size={22} className={location.pathname === '/cart' ? 'text-emerald-600 dark:text-emerald-400 stroke-[2.5]' : 'stroke-2'} />
            {cart?.items?.length > 0 && (
              <span className="absolute -right-2.5 -top-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 dark:bg-emerald-500 text-[10px] font-black text-white flex items-center justify-center ring-2 ring-white dark:ring-[#0c1220] shadow-sm">
                {cart.items.length}
              </span>
            )}
          </div>
          <span>Cart</span>
        </Link>
      </nav>
    </div>
  );
}

export default CustomerLayout;
