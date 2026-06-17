import { Button, Input, Tag, Typography } from 'antd';
import { Globe, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MOCK_ENVIRONMENTS } from './shared/mockData';
import { Environment } from './shared/types';

let idCounter = 0;
const nextId = () => `env-new-${(idCounter += 1)}`;

const emptyDraft = (): Omit<Environment, 'id'> => ({
  name: '',
  url: '',
  login: '',
  password: '',
});

// null = no form open, 'new' = adding, otherwise the id of the env being edited
type FormMode = string | null;

function Environments() {
  const { t } = useTranslation();
  const [environments, setEnvironments] = useState<Environment[]>(
    MOCK_ENVIRONMENTS,
  );
  const [mode, setMode] = useState<FormMode>(null);
  const [draft, setDraft] = useState(emptyDraft());

  const canSave = draft.name.trim() && draft.url.trim();

  const startAdd = () => {
    setDraft(emptyDraft());
    setMode('new');
  };

  const startEdit = (env: Environment) => {
    setDraft({
      name: env.name,
      url: env.url,
      login: env.login ?? '',
      password: env.password ?? '',
    });
    setMode(env.id);
  };

  const handleSave = () => {
    if (!canSave) return;
    const values = {
      name: draft.name.trim(),
      url: draft.url.trim(),
      login: draft.login?.trim() || undefined,
      password: draft.password?.trim() || undefined,
    };
    if (mode === 'new') {
      setEnvironments((prev) => [...prev, { id: nextId(), ...values }]);
    } else {
      setEnvironments((prev) =>
        prev.map((env) => (env.id === mode ? { ...env, ...values } : env)),
      );
    }
    setDraft(emptyDraft());
    setMode(null);
  };

  const handleCancel = () => {
    setDraft(emptyDraft());
    setMode(null);
  };

  const handleDelete = (id: string) => {
    setEnvironments((prev) => prev.filter((env) => env.id !== id));
    if (mode === id) setMode(null);
  };

  const renderForm = () => (
    <div className="border rounded-lg p-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Typography.Text type="secondary" className="text-sm!">
          {t('Name')}
        </Typography.Text>
        <Input
          placeholder={t('e.g. Production')}
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1">
        <Typography.Text type="secondary" className="text-sm!">
          {t('URL')}
        </Typography.Text>
        <Input
          placeholder="https://app.example.com"
          value={draft.url}
          onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Typography.Text type="secondary" className="text-sm!">
          {t('Login (optional)')}
        </Typography.Text>
        <Input
          placeholder={t('Username or email')}
          value={draft.login}
          onChange={(e) => setDraft((d) => ({ ...d, login: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Typography.Text type="secondary" className="text-sm!">
          {t('Password (optional)')}
        </Typography.Text>
        <Input.Password
          placeholder={t('Password')}
          value={draft.password}
          onChange={(e) =>
            setDraft((d) => ({ ...d, password: e.target.value }))
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="primary" onClick={handleSave} disabled={!canSave}>
          {t('Save')}
        </Button>
        <Button onClick={handleCancel}>{t('Cancel')}</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Typography.Text strong>{t('Environments')}</Typography.Text>
        <Typography.Text type="secondary" className="text-sm!">
          {t(
            'Define the environments your tests run against. Each environment has a URL and optional login credentials the test agent will use when a login screen is encountered.',
          )}
        </Typography.Text>
      </div>

      <div className="flex flex-col gap-2">
        {environments.length === 0 && mode !== 'new' && (
          <Typography.Text type="secondary" className="text-sm!">
            {t('No environments yet. Add one to get started.')}
          </Typography.Text>
        )}
        {environments.map((env) =>
          mode === env.id ? (
            <div key={env.id}>{renderForm()}</div>
          ) : (
            <div
              key={env.id}
              className="border rounded-lg px-3 py-2 flex items-center justify-between gap-3"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{env.name}</span>
                  {env.login ? (
                    <Tag color="blue">{t('With credentials')}</Tag>
                  ) : (
                    <Tag>{t('No credentials')}</Tag>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-disabled-text truncate">
                  <Globe size={12} />
                  <span className="truncate">{env.url}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="text"
                  size="small"
                  icon={<Pencil size={14} />}
                  onClick={() => startEdit(env)}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 size={14} />}
                  onClick={() => handleDelete(env.id)}
                />
              </div>
            </div>
          ),
        )}
      </div>

      {mode === 'new' ? (
        renderForm()
      ) : (
        <div>
          <Button icon={<Plus size={14} />} onClick={startAdd}>
            {t('Add Environment')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default Environments;
