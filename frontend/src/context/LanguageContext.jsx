import { createContext, useContext, useState, useEffect } from 'react';
import { initGoogleTranslate, applyWebsiteLanguage } from '../services/googleTranslate';

export const LanguageContext = createContext(null);

export const translations = {
  en: {
    // Navigation & common buttons
    'Home': 'Home',
    'Categories': 'Categories',
    'Orders': 'Orders',
    'Cart': 'Cart',
    'Profile': 'Profile',
    'Search': 'Search',
    'Add to Cart': 'Add to Cart',
    'Checkout': 'Checkout',
    'Back to Store': 'Back to Store',
    'Back to Dashboard': 'Back to Dashboard',
    'Back to Shop': 'Back to Shop',
    'Shop Now': 'Shop Now',
    'Go to Cart': 'Go to Cart',

    // Profile items
    'Your Orders': 'Your Orders',
    'Your Orders Desc': 'Track, return, or buy things again',
    'Digital Wallet': 'Digital Wallet',
    'Digital Wallet Desc': 'Check your balance and transactions',
    'Refer & Earn': 'Refer & Earn',
    'Refer & Earn Desc': 'Invite friends, earn real money!',
    'Account Settings': 'Account Settings',
    'Account Settings Desc': 'Manage password & personal details',
    'Saved Addresses': 'Saved Addresses',
    'Saved Addresses Desc': 'Edit addresses for quick checkout',
    'Favorites': 'Favorites',
    'Favorites Desc': 'View your saved products',
    'Notifications': 'Notifications',
    'Notifications Desc': 'Offers and order updates',
    'Feedback': 'Feedback',
    'Leave Feedback': 'Leave Feedback',
    'Feedback Desc': 'Tell us how we are doing',
    'Help Center': 'Help Center',
    'Help Center Desc': 'Contact support for assistance',
    'App Settings': 'App Settings',
    'App Settings Desc': 'Customize theme & font size',
    'Offers & Promo Codes': 'Offers & Promo Codes',
    'Offers & Promo Codes Desc': 'Find discounts and coupon codes',
    'Languages': 'Language / భాష',
    'Languages Desc': 'Choose your preferred language',
    'Sign Out': 'Sign Out',

    // App Settings terms
    'Appearance': 'Appearance',
    'Appearance Subtitle': 'Choose how Narendra Kirana looks to you.',
    'Light Mode': 'Light Mode',
    'Light Mode Desc': 'Crisp, bright, and familiar layout',
    'Dark Mode': 'Dark Mode',
    'Dark Mode Desc': 'Easy on the eyes in low light',
    'Font Size': 'Font Size',
    'Font Size Subtitle': 'Adjust text scaling across the store for comfortable reading.',
    'Normal': 'Normal (16px)',
    'Large': 'Large (18px)',
    'Extra Large': 'Extra Large (20px)',
    'Live Preview': 'Live Preview',
    'Live Preview Subtitle': 'This is how headings, descriptions, and buttons will appear across the app.',
    'Live Preview Sample Heading': 'Fresh Vegetables & Grocery Delivered in 30 Mins',
    'Live Preview Sample Body': 'Enjoy pure, high quality daily staples, farm fresh vegetables, dairy products, and household items at the best prices.',
    'Live Preview Sample Badge': 'Extra 15% OFF',
    'App Settings Title': 'App Settings',
    'App Settings Subtitle': 'Customize appearance, theme, and font size preferences',

    // Offers terms
    'Available Offers': 'Available Offers',
    'Available Offers Subtitle': 'Save big on your daily groceries with exclusive promo codes and vouchers.',
    'Copy Code': 'Copy Code',
    'Copied': 'Copied!',
    'Min Order': 'Min Order',
    'Valid Till': 'Valid Till',
    'Apply at Checkout': 'Apply at Checkout',
    'Flat Discount': 'FLAT ₹{amount} OFF',
    'Percent Discount': '{amount}% OFF',
    'No Expiry': 'No expiration date',
    'Applicable On Category': 'Applicable on {category}',
    'Max Discount': 'Max Discount',
    'No Promo Codes Available': 'No Promo Codes Available',
    'No Promo Codes Desc': 'There are no active coupons right now. Check back soon for exciting deals!',
    'Shop Groceries': 'Shop Groceries',
    'Coupon Copied Toast': 'Coupon code copied to clipboard!',

    // Language Settings terms
    'Language Settings': 'Language Settings',
    'Language Settings Subtitle': 'Select your preferred language for using Narendra Kirana',
    'English (India)': 'English (India)',
    'English Desc': 'Use Narendra Kirana in English',
    'Telugu (India)': 'తెలుగు (India)',
    'Telugu Desc': 'నరేంద్ర కిరాణాను తెలుగులో ఉపయోగించండి',
    'Language Updated': 'Language preference saved successfully!',
  },
  te: {
    // Navigation & common buttons
    'Home': 'హోమ్',
    'Categories': 'కేటగిరీలు',
    'Orders': 'ఆర్డర్లు',
    'Cart': 'కార్ట్',
    'Profile': 'ప్రొఫైల్',
    'Search': 'శోధించండి',
    'Add to Cart': 'కార్ట్‌కు జోడించండి',
    'Checkout': 'చెక్‌అవుట్',
    'Back to Store': 'స్టోర్‌కు తిరిగి వెళ్లండి',
    'Back to Dashboard': 'డాష్‌బోర్డ్‌కు తిరిగి వెళ్లండి',
    'Back to Shop': 'షాప్‌కు తిరిగి వెళ్లండి',
    'Shop Now': 'ఇప్పుడే కొనండి',
    'Go to Cart': 'కార్ట్‌కు వెళ్లండి',

    // Profile items
    'Your Orders': 'మీ ఆర్డర్లు',
    'Your Orders Desc': 'ట్రాక్ చేయండి, రిటర్న్ చేయండి లేదా మళ్లీ కొనండి',
    'Digital Wallet': 'డిజిటల్ వాలెట్',
    'Digital Wallet Desc': 'మీ బ్యాలెన్స్ మరియు లావాదేవీలను తనిఖీ చేయండి',
    'Refer & Earn': 'రిఫర్ చేసి సంపాదించండి',
    'Refer & Earn Desc': 'స్నేహితులను ఆహ్వానించండి, నిజమైన నగదు పొందండి!',
    'Account Settings': 'ఖాతా సెట్టింగ్‌లు',
    'Account Settings Desc': 'పాస్‌వర్డ్ & వ్యక్తిగత వివరాలను నిర్వహించండి',
    'Saved Addresses': 'సేవ్ చేసిన చిరునామాలు',
    'Saved Addresses Desc': 'త్వరిత చెక్‌అవుట్ కోసం చిరునామాలను సవరించండి',
    'Favorites': 'ఇష్టమైనవి',
    'Favorites Desc': 'మీరు సేవ్ చేసిన ఉత్పత్తులను చూడండి',
    'Notifications': 'నోటిఫికేషన్‌లు',
    'Notifications Desc': 'ఆఫర్‌లు మరియు ఆర్డర్ అప్‌డేట్‌లు',
    'Feedback': 'ఫీడ్‌బ్యాక్',
    'Leave Feedback': 'ఫీడ్‌బ్యాక్ ఇవ్వండి',
    'Feedback Desc': 'మా సేవలు ఎలా ఉన్నాయో చెప్పండి',
    'Help Center': 'సహాయ కేంద్రం',
    'Help Center Desc': 'సహాయం కోసం మద్దతును సంప్రదించండి',
    'App Settings': 'యాప్ సెట్టింగ్‌లు',
    'App Settings Desc': 'థీమ్ మరియు ఫాంట్ పరిమాణాన్ని అనుకూలీకరించండి',
    'Offers & Promo Codes': 'ఆఫర్‌లు & ప్రోమో కోడ్‌లు',
    'Offers & Promo Codes Desc': 'డిస్కౌంట్లు మరియు కూపన్ కోడ్‌లను కనుగొనండి',
    'Languages': 'భాష / Language',
    'Languages Desc': 'మీకు కావలసిన భాషను ఎంచుకోండి',
    'Sign Out': 'లాగ్ అవుట్',

    // App Settings terms
    'Appearance': 'రూపం',
    'Appearance Subtitle': 'నరేంద్ర కిరాణా రూపాన్ని మీకు నచ్చినట్లు ఎంచుకోండి.',
    'Light Mode': 'లైట్ మోడ్',
    'Light Mode Desc': 'స్పష్టమైన, ప్రకాశవంతమైన వీక్షణ',
    'Dark Mode': 'డార్క్ మోడ్',
    'Dark Mode Desc': 'తక్కువ వెలుతురులో కళ్ళకు హాయిగా ఉండే వీక్షణ',
    'Font Size': 'ఫాంట్ పరిమాణం',
    'Font Size Subtitle': 'సులభంగా చదవడానికి అక్షరాల పరిమాణాన్ని సర్దుబాటు చేయండి.',
    'Normal': 'సాధారణ (16px)',
    'Large': 'పెద్దది (18px)',
    'Extra Large': 'చాలా పెద్దది (20px)',
    'Live Preview': 'ప్రత్యక్ష ప్రివ్యూ',
    'Live Preview Subtitle': 'యాప్‌లో హెడ్డింగ్‌లు, వివరణలు మరియు బటన్లు ఇలా కనిపిస్తాయి.',
    'Live Preview Sample Heading': '30 నిమిషాల్లో తాజా కూరగాయలు & కిరాణా సరుకులు హోమ్ డెలివరీ',
    'Live Preview Sample Body': 'అత్యుత్తమ నాణ్యమైన కిరాణా సామాగ్రి, తాజా కూరగాయలు, పాల ఉత్పత్తులు మరియు నిత్యావసరాలను ఉత్తమ ధరలకు ఆస్వాదించండి.',
    'Live Preview Sample Badge': 'అదనపు 15% తగ్గింపు',
    'App Settings Title': 'యాప్ సెట్టింగ్‌లు',
    'App Settings Subtitle': 'థీమ్ మరియు ఫాంట్ సైజు ప్రాధాన్యతలను మార్చుకోండి',

    // Offers terms
    'Available Offers': 'అందుబాటులో ఉన్న ఆఫర్‌లు',
    'Available Offers Subtitle': 'ప్రత్యేకమైన ప్రోమో కోడ్‌లతో మీ కిరాణా కొనుగోళ్లపై మరింత ఆదా చేయండి.',
    'Copy Code': 'కోడ్ కాపీ చేయండి',
    'Copied': 'కాపీ చేయబడింది!',
    'Min Order': 'కనిష్ట ఆర్డర్',
    'Valid Till': 'చెల్లుబాటు తేదీ',
    'Apply at Checkout': 'చెక్‌అవుట్ వద్ద వర్తింపజేయండి',
    'Flat Discount': 'ఫ్లాట్ ₹{amount} తగ్గింపు',
    'Percent Discount': '{amount}% తగ్గింపు',
    'No Expiry': 'గడువు తేదీ లేదు',
    'Applicable On Category': '{category} కేటగిరీకి మాత్రమే వర్తిస్తుంది',
    'Max Discount': 'గరిష్ట తగ్గింపు',
    'No Promo Codes Available': 'ప్రస్తుతం ప్రోమో కోడ్‌లు అందుబాటులో లేవు',
    'No Promo Codes Desc': 'ప్రస్తుతం ఎలాంటి కూపన్లు లేవు. ప్రత్యేక ఆఫర్ల కోసం త్వరలో మళ్లీ తనిఖీ చేయండి!',
    'Shop Groceries': 'కిరాణా సరుకులు కొనండి',
    'Coupon Copied Toast': 'కూపన్ కోడ్ కాపీ చేయబడింది!',

    // Language Settings terms
    'Language Settings': 'భాష సెట్టింగ్‌లు',
    'Language Settings Subtitle': 'మీరు ఉపయోగించాలనుకుంటున్న భాషను ఎంచుకోండి',
    'English (India)': 'English (India)',
    'English Desc': 'నరేంద్ర కిరాణాను ఆంగ్లంలో ఉపయోగించండి',
    'Telugu (India)': 'తెలుగు (India)',
    'Telugu Desc': 'నరేంద్ర కిరాణాను తెలుగులో ఉపయోగించండి',
    'Language Updated': 'భాష విజయవంతంగా మార్చబడింది!',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('sk_language');
      return saved === 'te' ? 'te' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    initGoogleTranslate();
    try {
      const saved = localStorage.getItem('sk_language');
      if (saved === 'te') {
        applyWebsiteLanguage('te');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const changeLanguage = (code) => {
    const validLang = code === 'te' ? 'te' : 'en';
    setLanguageState(validLang);
    try {
      localStorage.setItem('sk_language', validLang);
    } catch (e) {
      console.error('Failed to save language in localStorage', e);
    }
    applyWebsiteLanguage(validLang);
  };

  const setLanguage = changeLanguage;

  const t = (key, params = {}) => {
    if (!key) return '';
    const dict = translations[language] || translations['en'];
    let val = dict[key] || translations['en']?.[key] || key;

    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        val = val.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramVal);
      });
    }

    return val;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
