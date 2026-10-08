import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import './password-rules.css';

type Rule = { key: string; label: string; met: boolean };

const SYMBOLS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const ALLOWED = /^[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]*$/;

/** `validatePassword`'s regex, clause by clause. */
export function passwordRules(
  password: string,
  t: (s: string, o?: Record<string, unknown>) => string,
): Rule[] {
  const rules: Rule[] = [
    {
      key: 'length',
      label: t('At least 8 characters'),
      met: password.length >= 8,
    },
    {
      key: 'upper',
      label: t('An uppercase letter'),
      met: /[A-Z]/.test(password),
    },
    {
      key: 'lower',
      label: t('A lowercase letter'),
      met: /[a-z]/.test(password),
    },
    { key: 'digit', label: t('A digit'), met: /\d/.test(password) },
    { key: 'symbol', label: t('A symbol'), met: SYMBOLS.test(password) },
  ];
  if (!ALLOWED.test(password)) {
    const bad = [
      ...new Set([...password].filter((c) => !ALLOWED.test(c))),
    ].slice(0, 3);
    const list = bad
      .map((c) => (c === ' ' ? t('a space') : `“${c}”`))
      .join(', ');
    rules.push({
      key: 'allowed',
      label: t('Only letters, digits and symbols, not {{list}}', { list }),
      met: false,
    });
  }
  return rules;
}

export function PasswordRules({ password }: { password: string }) {
  const { t } = useTranslation();
  const rules = passwordRules(password, t);
  return (
    <ul
      className={`m-pwrules${rules.every((r) => r.met) ? ' is-met' : ''}`}
      aria-label={t('Password rules')}
    >
      {rules.map((r) => (
        <li
          key={r.key}
          className={`m-pwrules__row${r.met ? ' is-met' : ''}${r.key === 'allowed' ? ' is-bad' : ''}`}
        >
          <span className="m-pwrules__mark" aria-hidden="true">
            {r.met && <Check size={10} strokeWidth={3} className="m-mark" />}
          </span>
          <span className="m-pwrules__label">{r.label}</span>
          <span className="sr-only">{r.met ? t(', met') : t(', not yet')}</span>
        </li>
      ))}
    </ul>
  );
}
