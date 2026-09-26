import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';
import pt from './pt.json';

export const SUPPORTED_LOCALES = ['en', 'es', 'pt'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

function detectLocale(): Locale {
  const saved = localStorage.getItem('wraith-locale') as Locale | null;
  if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) return saved;
  const browser = navigator.language.split('-')[0] as Locale;
  if ((SUPPORTED_LOCALES as readonly string[]).includes(browser)) return browser;
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    pt: { translation: pt },
  },
  lng: detectLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function changeLocale(lang: Locale): void {
  localStorage.setItem('wraith-locale', lang);
  void i18n.changeLanguage(lang);
}

export default i18n;
