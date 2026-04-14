import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import om from './locales/om.json';

export const resources = {
  en: { translation: en },
  om: { translation: om },
} as const;

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'om', name: 'Oromifa', nativeName: 'Afaan Oromoo' },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
