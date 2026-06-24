import { Button, Input, Skeleton, Switch, Tag, Typography } from 'antd';
import { Globe, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import {
  useCreateEnvironment,
  useDeleteEnvironment,
  useEnvironments,
  useUpdateEnvironment,
} from '../queries';
import { Environment, EnvironmentRequest } from './shared/types';

interface Draft {
  name: string;
  baseUrl: string;
  isDefault: boolean;
  requiresLogin: boolean;
  login: string;
  password: string;
}

const emptyDraft = (): Draft => ({
  name: '',
  baseUrl: '',
  isDefault: false,
  requiresLogin: false,
  login: '',
  password: '',
});

// Credentials are stored as non-secret variables on the environment.
const draftToRequest = (draft: Draft): EnvironmentRequest => {
  const variables: Record<string, unknown> = {};
  if (draft.requiresLogin) {
    if (draft.login.trim()) variables.login = draft.login.trim();
    if (draft.password.trim()) variables.password = draft.password.trim();
  }
  return {
    name: draft.name.trim(),
    baseUrl: draft.baseUrl.trim(),
    variables,
    isDefault: draft.isDefault,
  };
};

const envToDraft = (env: Environment): Draft => ({
  name: env.name,
  baseUrl: env.baseUrl,
  isDefault: !!env.isDefault,
  requiresLogin: !!env.variables?.login,
  login: String(env.variables?.login ?? ''),
  password: String(env.variables?.password ?? ''),
});

// null = no form open, 'new' = adding, otherwise the id of the env being edited
type FormMode = string | null;

function Environments() {
  const { t } = useTranslation();
  const { data, isPending } = useEnvironments();
  const createEnv = useCreateEnvironment();
  const updateEnv = useUpdateEnvironment();
  const deleteEnv = useDeleteEnvironment();

  const environments = data?.items ?? [];
  const [mode, setMode] = useState<FormMode>(null);
  const [draft, setDraft] = useState(emptyDraft());

  const canSave = draft.name.trim() && draft.baseUrl.trim();
  const isSaving = createEnv.isPending || updateEnv.isPending;

  const startAdd = () => {
    // Pre-seed the URL scheme so users only type the host.
    setDraft({ ...emptyDraft(), baseUrl: 'https://' });
    setMode('new');
  };

  const startEdit = (env: Environment) => {
    setDraft(envToDraft(env));
    setMode(env.environmentId);
  };

  const handleSave = () => {
    if (!canSave) return;
    const body = draftToRequest(draft);
    const onSuccess = () => {
      setDraft(emptyDraft());
      setMode(null);
    };
    const onError = () => toast.error(t('Failed to save environment'));

    if (mode === 'new') {
      createEnv.mutate(body, { onSuccess, onError });
    } else if (mode) {
      updateEnv.mutate({ environmentId: mode, body }, { onSuccess, onError });
    }
  };

  const handleCancel = () => {
    setDraft(emptyDraft());
    setMode(null);
  };

  const handleDelete = (id: string) => {
    deleteEnv.mutate(id, {
      onSuccess: () => {
        if (mode === id) setMode(null);
      },
      onError: () =>
        toast.error(
          t('Failed to delete environment. It may still be used by a test.'),
        ),
    });
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
          value={draft.baseUrl}
          onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          size="small"
          checked={draft.isDefault}
          onChange={(checked) =>
            setDraft((d) => ({ ...d, isDefault: checked }))
          }
        />
        <Typography.Text className="text-sm!">
          {t('Set as default')}
        </Typography.Text>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          size="small"
          checked={draft.requiresLogin}
          onChange={(checked) =>
            setDraft((d) => ({ ...d, requiresLogin: checked }))
          }
        />
        <Typography.Text className="text-sm!">
          {t('Requires login')}
        </Typography.Text>
      </div>
      {draft.requiresLogin && (
        <>
          <div className="flex flex-col gap-1">
            <Typography.Text type="secondary" className="text-sm!">
              {t('Login')}
            </Typography.Text>
            <Input
              placeholder={t('Username or email')}
              value={draft.login}
              onChange={(e) =>
                setDraft((d) => ({ ...d, login: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Typography.Text type="secondary" className="text-sm!">
              {t('Password')}
            </Typography.Text>
            <Input.Password
              placeholder={t('Password')}
              value={draft.password}
              onChange={(e) =>
                setDraft((d) => ({ ...d, password: e.target.value }))
              }
            />
          </div>
        </>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="primary"
          onClick={handleSave}
          disabled={!canSave}
          loading={isSaving}
        >
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

      {isPending ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <div className="flex flex-col gap-2">
          {environments.length === 0 && mode !== 'new' && (
            <Typography.Text type="secondary" className="text-sm!">
              {t('No environments yet. Add one to get started.')}
            </Typography.Text>
          )}
          {environments.map((env) => {
            const hasCredentials = !!env.variables?.login;
            return mode === env.environmentId ? (
              <div key={env.environmentId}>{renderForm()}</div>
            ) : (
              <div
                key={env.environmentId}
                className="border rounded-lg px-3 py-2 flex items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{env.name}</span>
                    {env.isDefault && <Tag color="gold">{t('Default')}</Tag>}
                    {hasCredentials ? (
                      <Tag color="blue">{t('With credentials')}</Tag>
                    ) : (
                      <Tag>{t('No credentials')}</Tag>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-disabled-text truncate">
                    <Globe size={12} />
                    <span className="truncate">{env.baseUrl}</span>
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
                    loading={
                      deleteEnv.isPending &&
                      deleteEnv.variables === env.environmentId
                    }
                    icon={<Trash2 size={14} />}
                    onClick={() => handleDelete(env.environmentId)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

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
