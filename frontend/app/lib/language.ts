import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' },
  { value: 'uk', label: 'Українська' },
  { value: 'zh', label: '简体中文' },
  { value: 'ko', label: '한국어' },
];

/** Switches the interface language and remembers it once it has loaded;
    `onChanged` runs then, for the last pick only. */
export function useChangeLanguage(onChanged?: () => void) {
  const { i18n } = useTranslation();
  const pending = useRef<string | null>(null);
  return (code: string) => {
    // a slower earlier locale chunk must not be the one that wins
    pending.current = code;
    void i18n.changeLanguage(code, (err) => {
      if (pending.current !== code) {
        void i18n.changeLanguage(pending.current!);
        return;
      }
      // a locale that failed to load is neither remembered nor announced
      if (err) {
        console.error('Could not load the language', err);
        return;
      }
      localStorage.setItem('i18nextLng', code);
      onChanged?.();
    });
  };
}
