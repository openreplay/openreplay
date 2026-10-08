import { Button } from '@/ui/actions/button';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { SimpleSelect } from '@/ui/inputs/select';
import '@/ui/layout/page-card.css';
import { observer } from 'mobx-react-lite';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { login, signup } from 'App/routes';
import { useNavigate } from 'App/routing';

import { SupportMenu } from 'Shared/SupportMenu/SupportMenu';

import './auth.css';

export const LEGAL = {
  privacy: 'https://openreplay.com/legal/privacy',
  terms: 'https://openreplay.com/legal/terms',
};

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' },
  { value: 'uk', label: 'Українська' },
  { value: 'zh', label: '简体中文' },
  { value: 'ko', label: '한국어' },
];

interface Props {
  /** Which other door the top-right corner offers. */
  other: 'signup' | 'signin' | 'back' | null;
  /** Keys the card so it re-enters when the step changes. */
  step?: string;
  children: ReactNode;
}

/** The public pages' ground: brand row, one card, small print. */
function AuthScreen({ other, step, children }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userStore } = useStore();
  const pending = React.useRef<string | null>(null);
  const year = new Date().getFullYear();

  const changeLanguage = (code: string) => {
    localStorage.setItem('i18nextLng', code);
    // a slower earlier locale chunk must not be the one that wins
    pending.current = code;
    void i18n.changeLanguage(code).then(() => {
      if (pending.current !== code) void i18n.changeLanguage(pending.current!);
    });
  };

  return (
    <div className="m-auth">
      <header className="m-auth__top">
        <span className="m-auth__brand">
          <OpenReplayMark size={26} />
          <span className="m-auth__brand-name">OpenReplay</span>
        </span>
        <span className="m-auth__other">
          {other === 'signup' ? (
            <>
              {t('New here?')}
              <Button variant="secondary" onClick={() => navigate(signup())}>
                {t('Create account')}
              </Button>
            </>
          ) : other === 'signin' ? (
            <>
              {t('Already have an account?')}
              <Button variant="secondary" onClick={() => navigate(login())}>
                {t('Sign in')}
              </Button>
            </>
          ) : other === 'back' ? (
            <Button variant="subtle" onClick={() => navigate(login())}>
              {t('Back to sign in')}
            </Button>
          ) : null}
        </span>
      </header>

      <div className="m-auth__body">
        <section
          className="m-auth__card m-panel"
          aria-labelledby="m-auth-title"
        >
          <div className="m-auth__enter m-step-in" key={step}>
            {children}
          </div>
        </section>
      </div>

      <footer className="m-auth__foot">
        <span>
          {t('© {{year}} OpenReplay. All rights reserved.', { year })}{' '}
          <a
            className="m-auth__ext"
            href={LEGAL.privacy}
            target="_blank"
            rel="noreferrer"
          >
            {t('Privacy')}
          </a>{' '}
          {t('and')}{' '}
          <a
            className="m-auth__ext"
            href={LEGAL.terms}
            target="_blank"
            rel="noreferrer"
          >
            {t('Terms')}
          </a>
          .
        </span>
        <span className="m-auth__foot-right">
          {!userStore.isEnterprise && <SupportMenu placement="topLeft" />}
          <SimpleSelect<string>
            variant="subtle"
            ariaLabel={t('Language')}
            className="m-auth__lang"
            value={i18n.language?.slice(0, 2)}
            onChange={(v) => v && changeLanguage(v)}
            options={LANGUAGES}
          />
        </span>
      </footer>
    </div>
  );
}

export default observer(AuthScreen);
