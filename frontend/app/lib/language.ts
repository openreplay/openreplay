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

/** Switches the interface language and remembers it; `onChanged` runs once
    the last pick has loaded. */
export function useChangeLanguage(onChanged?: () => void) {
  const { i18n } = useTranslation();
  const pending = useRef<string | null>(null);
  return (code: string) => {
    localStorage.setItem('i18nextLng', code);
    // a slower earlier locale chunk must not be the one that wins
    pending.current = code;
    void i18n.changeLanguage(code).then(() => {
      if (pending.current !== code) void i18n.changeLanguage(pending.current!);
      else onChanged?.();
    });
  };
}
