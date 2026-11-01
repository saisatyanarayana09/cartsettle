const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';

export function initGoogleTranslate() {
  if (typeof window === 'undefined') return;

  // Set up Google Translate callback
  window.googleTranslateElementInit = function () {
    if (window.google && window.google.translate) {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,te,hi,ta,kn',
          autoDisplay: false,
        },
        'google_translate_element'
      );
    }
  };

  if (!document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID)) {
    // Create hidden mount point if missing
    if (!document.getElementById('google_translate_element')) {
      const div = document.createElement('div');
      div.id = 'google_translate_element';
      div.style.display = 'none';
      document.body.appendChild(div);
    }

    const script = document.createElement('script');
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }
}

export function applyWebsiteLanguage(langCode) {
  if (typeof window === 'undefined') return;
  const target = langCode === 'te' ? '/auto/te' : '/auto/en';
  const hostname = window.location.hostname;

  // Set cookie for current domain and root
  document.cookie = `googtrans=${target}; path=/; domain=${hostname}`;
  document.cookie = `googtrans=${target}; path=/;`;

  // If Google translate select element is available, trigger it
  const select = document.querySelector('.goog-te-combo');
  if (select) {
    select.value = langCode;
    select.dispatchEvent(new Event('change'));
  } else {
    // If script not loaded yet or switching between languages, reload or initialize
    initGoogleTranslate();
  }
}
