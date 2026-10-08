import { Button } from '@/ui/actions/button';
import { Input } from '@/ui/inputs/input';
import { PasswordInput } from '@/ui/inputs/password-input';
import { SimpleSelect } from '@/ui/inputs/select';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { useToast } from '@/ui/overlays/toast';
import withPageTitle from 'HOCs/withPageTitle';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PASSWORD_POLICY } from 'App/constants';
import { useStore } from 'App/mstore';
import { validatePassword } from 'App/validate';

import { PrefBlock, PrefField, PrefToggle, SecretValue } from '../PrefSection';
import Dangerzone from './Dangerzone';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' },
  { value: 'uk', label: 'Українська' },
  { value: 'zh', label: '简体中文' },
  { value: 'ko', label: '한국어' },
];

function ProfileSettings() {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const { account, isEnterprise } = userStore;
  const isAdmin = account.admin || account.superAdmin;

  return (
    <>
      <Profile />
      {account.hasPassword ? <Password /> : null}
      <Language />
      <ApiKey />
      {isEnterprise && isAdmin ? (
        <PrefBlock
          title={t('Tenant key')}
          hint={t('For SSO (SAML). Your identity provider asks for this one.')}
        >
          <PrefField>
            <SecretValue
              value={account.tenantKey ?? ''}
              secret={false}
              label={t('tenant key')}
            />
          </PrefField>
        </PrefBlock>
      ) : null}
      {!isEnterprise ? <DataCollection /> : null}
      {account.license ? (
        <PrefBlock
          title={t('License')}
          hint={
            account.expirationDate
              ? t('Expires on {{date}}', {
                  date: account.expirationDate.toFormat('LLL dd, yyyy'),
                })
              : undefined
          }
        >
          <PrefField>
            <SecretValue
              value={account.license}
              secret={false}
              label={t('license')}
            />
          </PrefField>
        </PrefBlock>
      ) : null}
      <Dangerzone />
    </>
  );
}

const Profile = observer(() => {
  const { t } = useTranslation();
  const toast = useToast();
  const { userStore } = useStore();
  const { account, loading } = userStore;
  const [name, setName] = React.useState(account.name ?? '');
  const [org, setOrg] = React.useState(account.tenantName ?? '');
  const dirty =
    name.trim() !== (account.name ?? '') ||
    org.trim() !== (account.tenantName ?? '');
  const valid = name.trim().length > 0 && org.trim().length > 0;

  const save = () =>
    userStore
      .updateClient({ name: name.trim(), tenantName: org.trim() })
      .then(() => toast.success(t('Profile settings updated successfully')))
      .catch((e: any) =>
        toast.error(e?.message || t('Failed to update account settings')),
      );

  return (
    <PrefBlock
      title={t('Profile')}
      hint={t(
        'Your email address is how you sign in, so it cannot be changed here.',
      )}
    >
      <PrefField label={t('Name')} htmlFor="pref-name">
        <Input
          id="pref-name"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
        />
      </PrefField>
      <PrefField label={t('Email')}>
        <Input value={account.email ?? ''} readOnly aria-readonly="true" />
      </PrefField>
      <PrefField label={t('Organization')} htmlFor="pref-org">
        <Input
          id="pref-org"
          value={org}
          maxLength={50}
          onChange={(e) => setOrg(e.target.value)}
        />
      </PrefField>
      <div className="m-pref__row">
        <Button
          variant="primary"
          disabled={!dirty || !valid || loading}
          onClick={() => void save()}
        >
          {t('Update')}
        </Button>
      </div>
    </PrefBlock>
  );
});

const Password = observer(() => {
  const { t } = useTranslation();
  const toast = useToast();
  const { userStore } = useStore();
  const { errors, loading } = userStore.updatePasswordRequest;
  const [pw, setPw] = React.useState({ current: '', next: '', confirm: '' });
  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.next;
  const weak = pw.next.length > 0 && !validatePassword(pw.next);
  const valid =
    pw.current.length > 0 &&
    validatePassword(pw.next) &&
    pw.next === pw.confirm;

  const save = () =>
    userStore
      .updatePassword({ oldPassword: pw.current, newPassword: pw.next })
      .then(() => {
        setPw({ current: '', next: '', confirm: '' });
        toast.success(t('Password updated'));
      })
      .catch(() => {});

  return (
    <PrefBlock
      title={t('Password')}
      hint={t(
        'Updating your password from time to time keeps your account safe.',
      )}
    >
      <PrefField label={t('Current password')} htmlFor="pref-pw0">
        <PasswordInput
          id="pref-pw0"
          autoComplete="current-password"
          value={pw.current}
          onChange={(e) => setPw({ ...pw, current: e.target.value })}
        />
      </PrefField>
      <PrefField
        label={t('New password')}
        htmlFor="pref-pw1"
        note={
          weak ? (
            <span className="m-pref__field-note is-error">
              {PASSWORD_POLICY(t)}
            </span>
          ) : undefined
        }
      >
        <PasswordInput
          id="pref-pw1"
          autoComplete="new-password"
          value={pw.next}
          onChange={(e) => setPw({ ...pw, next: e.target.value })}
        />
      </PrefField>
      <PrefField
        label={t('Confirm new password')}
        htmlFor="pref-pw2"
        note={
          mismatch ? (
            <span className="m-pref__field-note is-error">
              {t("Passwords don't match")}
            </span>
          ) : undefined
        }
      >
        <PasswordInput
          id="pref-pw2"
          autoComplete="new-password"
          value={pw.confirm}
          onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
        />
      </PrefField>
      {errors.map((err: string, i: number) => (
        <p key={i} className="m-pref__field-note is-error">
          {err}
        </p>
      ))}
      <div className="m-pref__row">
        <Button
          variant="primary"
          disabled={!valid || loading}
          onClick={() => void save()}
        >
          {t('Change password')}
        </Button>
      </div>
    </PrefBlock>
  );
});

function Language() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const pending = React.useRef<string | null>(null);
  const change = (code: string) => {
    localStorage.setItem('i18nextLng', code);
    // a slower earlier locale chunk must not be the one that wins
    pending.current = code;
    void i18n.changeLanguage(code).then(() => {
      if (pending.current !== code) void i18n.changeLanguage(pending.current!);
      else toast.success(t('Language updated'));
    });
  };
  return (
    <PrefBlock
      title={t('Interface language')}
      hint={t(
        "What OpenReplay's own words appear in. It does not change your recordings.",
      )}
    >
      <PrefField>
        <SimpleSelect<string>
          value={i18n.language?.slice(0, 2)}
          ariaLabel={t('Interface language')}
          onChange={(v) => v && change(v)}
          options={LANGUAGES}
        />
      </PrefField>
    </PrefBlock>
  );
}

const ApiKey = observer(() => {
  const { t } = useTranslation();
  const toast = useToast();
  const { userStore } = useStore();
  const [confirming, setConfirming] = React.useState(false);
  return (
    <PrefBlock
      title={t('Organization API key')}
      hint={t(
        'Used by the public API on behalf of the whole organization. Treat it as a password.',
      )}
    >
      <PrefField
        note={t('Regenerating breaks every script using the old key.')}
      >
        <SecretValue
          value={userStore.account.apiKey ?? ''}
          label={t('API key')}
        />
      </PrefField>
      <div className="m-pref__row">
        <Button
          disabled={!userStore.isAdmin}
          onClick={() => setConfirming(true)}
        >
          {t('Regenerate')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title={t('Regenerate the API key?')}
        okText={t('Regenerate')}
        onCancel={() => setConfirming(false)}
        onOk={() => {
          setConfirming(false);
          void userStore
            .regenerateKey()
            .then(() => toast.success(t('A new API key is ready')));
        }}
      >
        {t(
          'The current key stops working the moment the new one is issued. Anything using it has to be given the new one.',
        )}
      </ConfirmDialog>
    </PrefBlock>
  );
});

const DataCollection = observer(() => {
  const { t } = useTranslation();
  const toast = useToast();
  const { userStore } = useStore();
  const [optOut, setOptOut] = React.useState(!!userStore.account.optOut);
  const change = (v: boolean) => {
    setOptOut(v);
    userStore
      .updateClient({ optOut: v })
      .then(() => toast.success(t('Account settings updated successfully')))
      .catch((e: any) => {
        setOptOut(!v);
        toast.error(e?.message || t('Failed to update account settings'));
      });
  };
  return (
    <PrefBlock
      title={t('Data collection')}
      hint={t(
        'Controls how OpenReplay captures data on your organization’s usage to improve the product.',
      )}
    >
      <PrefToggle checked={optOut} onChange={change} label={t('Anonymize')} />
    </PrefBlock>
  );
});

export default withPageTitle('Account - OpenReplay Preferences')(
  observer(ProfileSettings),
);
