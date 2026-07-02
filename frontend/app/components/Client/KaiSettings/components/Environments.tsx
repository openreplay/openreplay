import { App, Button, List, Skeleton, Tag, Typography } from 'antd';
import { Globe, PencilIcon, Plus, Trash2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useModal } from 'Components/ModalContext';
import { NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import {
  useCreateEnvironment,
  useDeleteEnvironment,
  useEnvironments,
  useTests,
  useUpdateEnvironment,
} from '../queries';
import EnvironmentForm from './EnvironmentForm';
import { apiEnvToVM, envFormToRequest } from './shared/adapters';
import { EnvironmentVM } from './shared/types';

// The API clamps `limit` to 100; the affected-tests lookup is best-effort within that.
const LOOKUP_LIMIT = 100;

// Environments list — same section pattern as the app's Webhooks / Projects settings:
// a titled header with a primary add action, an antd List with a hover-reveal edit, and
// a NoContent empty state. The add / edit form opens in the standard right drawer.
function Environments() {
  const { t } = useTranslation();
  const { openModal } = useModal();
  const { modal } = App.useApp();
  const { data, isPending } = useEnvironments();
  const { data: testsData } = useTests({ limit: LOOKUP_LIMIT });
  const createEnv = useCreateEnvironment();
  const updateEnv = useUpdateEnvironment();
  const deleteEnv = useDeleteEnvironment();

  const environments = (data?.items ?? []).map(apiEnvToVM);

  const create = (values: Omit<EnvironmentVM, 'id'>) =>
    createEnv.mutate(envFormToRequest(values), {
      onError: () => toast.error(t('Failed to save environment')),
    });

  const update = (id: string, values: Omit<EnvironmentVM, 'id'>) =>
    updateEnv.mutate(
      { environmentId: id, body: envFormToRequest(values) },
      { onError: () => toast.error(t('Failed to save environment')) },
    );

  const remove = (id: string) =>
    deleteEnv.mutate(id, {
      onError: () =>
        toast.error(
          t('Failed to delete environment. It may still be used by a test.'),
        ),
    });

  // Surface the tests that reference this environment before deleting — the API rejects
  // deleting a referenced environment (409), so warn to reassign them first.
  const confirmDelete = (env: EnvironmentVM) => {
    const affected = (testsData?.items ?? []).filter((tc) =>
      tc.environments?.includes(env.id),
    );
    modal.confirm({
      title: t('Delete environment?'),
      okText: t('Delete'),
      okButtonProps: { danger: true },
      cancelText: t('Cancel'),
      width: 460,
      content: affected.length ? (
        <div className="flex flex-col gap-2">
          <Typography.Text>
            {t(
              '“{{name}}” is used by the tests below. Remove it from them first — deleting a referenced environment will fail.',
              { name: env.name },
            )}
          </Typography.Text>
          <ul className="list-disc pl-5 text-sm text-gray-dark max-h-40 overflow-auto">
            {affected.map((tc) => (
              <li key={tc.testId}>{tc.name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <Typography.Text>
          {t('“{{name}}” will be permanently deleted. This can’t be undone.', {
            name: env.name,
          })}
        </Typography.Text>
      ),
      onOk: () => remove(env.id),
    });
  };

  const openAdd = () =>
    openModal(<EnvironmentForm onSubmit={create} />, {
      title: t('Add environment'),
    });

  const openEdit = (env: EnvironmentVM) =>
    openModal(
      <EnvironmentForm
        env={env}
        onSubmit={(values) => update(env.id, values)}
        onDelete={() => confirmDelete(env)}
      />,
      { title: t('Edit environment') },
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {t('Environments')}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-sm!">
            {t('The URLs and credentials your tests run against.')}
          </Typography.Text>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>
          {t('Add environment')}
        </Button>
      </div>

      {isPending ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <NoContent
          title={
            <div className="flex flex-col items-center justify-center">
              <AnimatedSVG name={ICONS.NO_WEBHOOKS} size={60} />
              <div className="text-center my-4">
                {t('No environments yet. Add one to get started.')}
              </div>
            </div>
          }
          size="small"
          show={environments.length === 0}
        >
          <List
            size="small"
            dataSource={environments}
            renderItem={(env) => (
              <List.Item
                onClick={() => openEdit(env)}
                className="p-2! group flex justify-between items-center gap-3 cursor-pointer hover:bg-active-blue transition"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{env.name}</span>
                    {env.isDefault && <Tag color="gold">{t('Default')}</Tag>}
                    {env.username ? (
                      <Tag color="blue">{t('With credentials')}</Tag>
                    ) : (
                      <Tag>{t('No credentials')}</Tag>
                    )}
                    {!!env.headers?.length && (
                      <Tag>
                        {env.headers.length} {t('headers')}
                      </Tag>
                    )}
                    {env.ignoreHttpsErrors && (
                      <Tag>{t('Ignores SSL errors')}</Tag>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-disabled-text truncate">
                    <Globe size={12} />
                    <span className="truncate">{env.url}</span>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    type="text"
                    className="invisible group-hover:visible"
                    icon={<PencilIcon size={16} />}
                    aria-label={t('Edit')}
                    onClick={() => openEdit(env)}
                  />
                  <Button
                    type="text"
                    danger
                    className="invisible group-hover:visible"
                    loading={
                      deleteEnv.isPending && deleteEnv.variables === env.id
                    }
                    icon={<Trash2 size={16} />}
                    aria-label={t('Delete')}
                    onClick={() => confirmDelete(env)}
                  />
                </div>
              </List.Item>
            )}
          />
        </NoContent>
      )}
    </div>
  );
}

export default Environments;
