import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

// Only `en` is bundled. It is the fallback language, so it has to be present
// before the first render; the other five are fetched on demand. Bundling all
// six put ~190KB gzip of translations on the critical path, the large majority
// of it for languages a given user never selects.
const lazyLocales = {
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
  ko: () => import('./locales/ko.json'),
  ru: () => import('./locales/ru.json'),
  zh: () => import('./locales/zh.json'),
  uk: () => import('./locales/uk.json'),
};

export const i18nReady = i18n
  .use(LanguageDetector)
  .use(
    resourcesToBackend((lng, _ns, cb) => {
      const load = lazyLocales[lng];
      if (!load) {
        // `en` is already in `resources`, and an unknown code falls back to it.
        cb(null, {});
        return;
      }
      load()
        .then((mod) => cb(null, mod.default))
        .catch(cb);
    }),
  )
  .use(initReactI18next)
  .init({
    // Without this i18next treats the bundled `en` as "everything is loaded"
    // and never calls the backend for the other languages.
    partialBundledLanguages: true,
    resources: {
      en: { translation: en },
    },
    lng: localStorage.getItem('i18nextLng') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    // The app has no Suspense boundary above the router, so a suspending
    // useTranslation would take the whole tree down. initialize.tsx awaits
    // `i18nReady` instead, which is a no-op microtask for `en`.
    react: {
      useSuspense: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

i18n.on('missingKey', (_lngs, ns, key) => {
  console.warn(`⚠️  ${ns}:${key} is missing`);
});

export default i18n;
