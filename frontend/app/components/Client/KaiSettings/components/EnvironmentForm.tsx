import { Button, Input, Switch, Typography } from 'antd';
import { ChevronDown, ChevronRight, Lock, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'Components/ModalContext';

import { Field } from './drawers/EntityDrawer';
import { EnvironmentVM, HttpHeader } from './shared/types';

interface Props {
  env?: EnvironmentVM;
  onSubmit: (values: Omit<EnvironmentVM, 'id'>) => void;
  onDelete?: () => void;
}

// Rendered inside the app's standard right-side drawer (ModalContext), the same
// pattern Team / Projects / Features use for add & edit.
function EnvironmentForm({ env, onSubmit, onDelete }: Props) {
  const { t } = useTranslation();
  const { closeModal } = useModal();

  const [name, setName] = useState(env?.name ?? '');
  const [url, setUrl] = useState(env?.url ?? 'https://');
  const [isDefault, setIsDefault] = useState(!!env?.isDefault);
  const [username, setUsername] = useState(env?.username ?? '');
  const [password, setPassword] = useState(env?.password ?? '');
  const [headers, setHeaders] = useState<HttpHeader[]>(env?.headers ?? []);
  const [ignoreHttps, setIgnoreHttps] = useState(!!env?.ignoreHttpsErrors);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(
      env?.username ||
      env?.password ||
      env?.headers?.length ||
      env?.ignoreHttpsErrors
    ),
  );

  const canSave = !!(name.trim() && url.trim());

  const save = () => {
    if (!canSave) return;
    onSubmit({
      name: name.trim(),
      url: url.trim(),
      isDefault,
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      headers: headers.filter((h) => h.name.trim()),
      ignoreHttpsErrors: ignoreHttps,
      // carry the stored variables through so unmanaged keys survive the wholesale PUT
      variables: env?.variables,
    });
    closeModal();
  };

  const addHeader = () => setHeaders((h) => [...h, { name: '', value: '' }]);
  const updateHeader = (i: number, field: 'name' | 'value', val: string) =>
    setHeaders((h) =>
      h.map((x, idx) => (idx === i ? { ...x, [field]: val } : x)),
    );
  const removeHeader = (i: number) =>
    setHeaders((h) => h.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-4">
      {/* the shared Field label — same style as every run-settings field elsewhere
          in Kai settings, not an ad-hoc one */}
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

      <div className="flex items-center gap-2">
        <Switch size="small" checked={isDefault} onChange={setIsDefault} />
        <Typography.Text className="text-sm!">
          {t('Set as default')}
        </Typography.Text>
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-sm text-disabled-text self-start"
        onClick={() => setShowAdvanced((s) => !s)}
      >
        {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {t('Security & Network (optional)')}
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-darkest">
              {t('HTTP Credentials')}
            </span>
            {/* these are the test target's creds, not the user's — keep browsers /
                password managers from autofilling the logged-in user's own login */}
            <Input
              placeholder={t('Username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <Input.Password
              placeholder={t('Password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-darkest">
              {t('HTTP Headers')}
            </span>
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder={t('Header name')}
                  value={h.name}
                  onChange={(e) => updateHeader(i, 'name', e.target.value)}
                />
                <Input
                  placeholder={t('Value')}
                  value={h.value}
                  onChange={(e) => updateHeader(i, 'value', e.target.value)}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 size={14} />}
                  aria-label={t('Remove header')}
                  onClick={() => removeHeader(i)}
                />
              </div>
            ))}
            <div>
              <Button
                size="small"
                icon={<Plus size={14} />}
                onClick={addHeader}
              >
                {t('Add Custom Header')}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2">
            <span className="flex items-center gap-2 text-sm">
              <Lock size={14} className="text-disabled-text" />
              {t('Ignore HTTPS certificate errors during testing')}
            </span>
            <Switch
              size="small"
              checked={ignoreHttps}
              onChange={setIgnoreHttps}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Button type="primary" onClick={save} disabled={!canSave}>
            {t('Save')}
          </Button>
          <Button type="text" onClick={closeModal}>
            {t('Cancel')}
          </Button>
        </div>
        {env && onDelete && (
          <Button
            type="text"
            danger
            icon={<Trash2 size={16} />}
            aria-label={t('Delete environment')}
            onClick={() => {
              onDelete();
              closeModal();
            }}
          />
        )}
      </div>
    </div>
  );
}

export default EnvironmentForm;
