import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Input } from '@/ui/inputs/input';
import { PasswordInput } from '@/ui/inputs/password-input';
import { Switch } from '@/ui/inputs/switch';
import {
  DrawerFooter,
  EntityDrawer,
  Field,
  Section,
} from '@/ui/overlays/EntityDrawer';
import { Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EnvironmentVM, HttpHeader } from './shared/types';

interface Props {
  /** `null` adds a new one. */
  env: EnvironmentVM | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Omit<EnvironmentVM, 'id'>) => void;
  onDelete?: () => void;
}

/** Add / edit an environment. Keyed by env id, so the draft is per environment. */
function EnvironmentForm({ env, open, onClose, onSubmit, onDelete }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(env?.name ?? '');
  const [url, setUrl] = useState(env?.url ?? 'https://');
  const [username, setUsername] = useState(env?.username ?? '');
  const [password, setPassword] = useState(env?.password ?? '');
  const [headers, setHeaders] = useState<HttpHeader[]>(env?.headers ?? []);
  const [ignoreHttps, setIgnoreHttps] = useState(!!env?.ignoreHttpsErrors);

  const canSave = !!(name.trim() && url.trim());

  const save = () => {
    if (!canSave) return;
    onSubmit({
      name: name.trim(),
      url: url.trim(),
      // default env is chosen in the defaults below, and the active flag isn't
      // user-managed here — preserve whatever the env already had
      isDefault: env?.isDefault,
      isActive: env?.isActive,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      headers: headers.filter((h) => h.name.trim()),
      ignoreHttpsErrors: ignoreHttps,
      // carry the stored variables through so unmanaged keys survive the wholesale PUT
      variables: env?.variables,
    });
    onClose();
  };

  const updateHeader = (i: number, field: 'name' | 'value', val: string) =>
    setHeaders((h) =>
      h.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)),
    );

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      eyebrow={t('Environment')}
      title={env ? env.name : t('New environment')}
      meta={env ? <span>{env.url}</span> : undefined}
      footer={
        <DrawerFooter
          left={
            env && onDelete ? (
              <IconButton
                icon={<Trash2 size={14} />}
                label={t('Delete environment')}
                variant="ghost"
                onClick={onDelete}
              />
            ) : undefined
          }
          right={
            <>
              <Button variant="subtle" onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button variant="primary" disabled={!canSave} onClick={save}>
                {env ? t('Save') : t('Add environment')}
              </Button>
            </>
          }
        />
      }
    >
      <Section title={t('Where tests run')}>
        <Field label={t('Name')}>
          <Input
            autoFocus
            value={name}
            placeholder={t('e.g. Production')}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={t('URL')}>
          <Input
            value={url}
            placeholder="https://app.example.com"
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
      </Section>
      <Section
        title={t('Sign-in')}
        hint={t('The test account the agent signs in with. Optional.')}
      >
        {/* the test target's creds, not the user's — keep browsers / password
            managers from autofilling the logged-in user's own login */}
        <Field label={t('Username')}>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
        <Field label={t('Password')}>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
      </Section>
      <Section
        title={t('HTTP headers')}
        hint={t('Sent with every request the test makes.')}
        action={
          <Button
            variant="subtle"
            onClick={() => setHeaders((h) => [...h, { name: '', value: '' }])}
          >
            <Plus size={13} />
            {t('Add header')}
          </Button>
        }
      >
        {headers.map((h, i) => (
          <div key={i} className="m-envform__header">
            <Input
              placeholder={t('Header name')}
              aria-label={t('Header name')}
              value={h.name}
              onChange={(e) => updateHeader(i, 'name', e.target.value)}
            />
            <Input
              placeholder={t('Value')}
              aria-label={t('Value')}
              value={h.value}
              onChange={(e) => updateHeader(i, 'value', e.target.value)}
            />
            <IconButton
              icon={<Trash2 size={14} />}
              label={t('Remove header')}
              variant="ghost"
              onClick={() =>
                setHeaders((hs) => hs.filter((_, idx) => idx !== i))
              }
            />
          </div>
        ))}
      </Section>
      <Section title={t('Network')}>
        <label className="m-envform__toggle">
          <span>{t('Ignore HTTPS certificate errors during testing')}</span>
          <Switch checked={ignoreHttps} onCheckedChange={setIgnoreHttps} />
        </label>
      </Section>
    </EntityDrawer>
  );
}

export default EnvironmentForm;
