import { useLast } from '@/lib/use-last';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Chip } from '@/ui/data/Chip';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { useToast } from '@/ui/overlays/toast';
import { Globe, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { LOOKUP_LIMIT } from './shared/utils';

function Environments() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, isPending } = useEnvironments({ limit: LOOKUP_LIMIT });
  // the affected-tests lookup is best-effort within one page
  const { data: testsData } = useTests({ limit: LOOKUP_LIMIT });
  const createEnv = useCreateEnvironment();
  const updateEnv = useUpdateEnvironment();
  const deleteEnv = useDeleteEnvironment();
  const [editing, setEditing] = useState<EnvironmentVM | 'new' | null>(null);
  const [target, setTarget] = useState<EnvironmentVM | null>(null);
  // the drawer keeps naming its environment while it slides away
  const shown = useLast(editing);

  const environments = (data?.items ?? []).map(apiEnvToVM);

  const submit = (values: Omit<EnvironmentVM, 'id'>) => {
    const onError = () => toast.error(t('Failed to save environment'));
    if (editing && editing !== 'new')
      updateEnv.mutate(
        { environmentId: editing.id, body: envFormToRequest(values) },
        { onError },
      );
    else createEnv.mutate(envFormToRequest(values), { onError });
  };

  // Name the tests that reference it before deleting. With referencing tests we
  // force-delete (`?force=true`): one call detaches the env from them, pauses any
  // that were active, and deletes. With none, a plain delete.
  const affected = target
    ? (testsData?.items ?? []).filter((tc) =>
        tc.environments?.includes(target.id),
      )
    : [];

  return (
    <section className="m-envs__section">
      <header className="m-envs__head">
        <div>
          <h2 className="m-envs__title">{t('Environments')}</h2>
          <p className="m-envs__sub">
            {t('The URLs and credentials your tests run against.')}
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus size={14} />
          {t('Add environment')}
        </Button>
      </header>

      {isPending ? (
        <SkeletonRows rows={2} columns={[60, 30]} />
      ) : environments.length === 0 ? (
        <EmptyState
          title={t('No environments yet')}
          hint={t(
            'A test needs somewhere to run: add the URL of the app you want the agent to open.',
          )}
        />
      ) : (
        <ul className="m-envs__list">
          {environments.map((env) => {
            const off = env.isActive === false;
            return (
              <li
                key={env.id}
                className={`m-envs__row${off ? ' is-off' : ''}`}
                onClick={(e) => {
                  if (
                    (e.target as HTMLElement).closest('button, [role="menu"]')
                  )
                    return;
                  setEditing(env);
                }}
              >
                <div className="m-envs__cell">
                  <div className="m-envs__name-line">
                    <span className="m-envs__name m-truncate">{env.name}</span>
                    {off && (
                      <Chip kind="status" tone="warning">
                        {t('Off')}
                      </Chip>
                    )}
                    <Chip kind="status">
                      {env.username ? t('Signs in') : t('No credentials')}
                    </Chip>
                    {!!env.headers?.length && (
                      <Chip kind="status">
                        {t('{{count}} headers', {
                          count: env.headers.length,
                        })}
                      </Chip>
                    )}
                    {env.ignoreHttpsErrors && (
                      <Chip kind="status">{t('Ignores SSL errors')}</Chip>
                    )}
                  </div>
                  <span className="m-envs__url m-truncate">
                    <Globe size={12} aria-hidden="true" />
                    {env.url}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span>
                      <IconButton
                        icon={<MoreHorizontal size={15} />}
                        label={t('Actions for {{name}}', { name: env.name })}
                        variant="ghost"
                      />
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItems
                      items={[
                        {
                          key: 'edit',
                          icon: <Pencil size={13} />,
                          label: t('Edit'),
                          onClick: () => setEditing(env),
                        },
                        { key: 'd', type: 'divider' },
                        {
                          key: 'delete',
                          icon: <Trash2 size={13} />,
                          label: t('Delete'),
                          danger: true,
                          onClick: () => setTarget(env),
                        },
                      ]}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <EnvironmentForm
        key={shown && shown !== 'new' ? shown.id : 'new'}
        env={shown && shown !== 'new' ? shown : null}
        open={editing != null}
        onClose={() => setEditing(null)}
        onSubmit={submit}
        onDelete={() => {
          if (editing && editing !== 'new') setTarget(editing);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={target != null}
        title={t('Delete this environment?')}
        okText={affected.length ? t('Pause tests and delete') : t('Delete')}
        danger
        onCancel={() => setTarget(null)}
        onOk={() => {
          if (target)
            deleteEnv.mutate(
              { environmentId: target.id, force: affected.length > 0 },
              {
                onError: () => toast.error(t('Failed to delete environment.')),
              },
            );
          setTarget(null);
        }}
      >
        {affected.length ? (
          <>
            {t(
              '“{{name}}” is used by the tests below. Deleting it removes it from them and pauses any that are active.',
              { name: target?.name },
            )}
            <ul className="m-envs__affected">
              {affected.map((tc) => (
                <li key={tc.testId}>{tc.name}</li>
              ))}
            </ul>
          </>
        ) : (
          t('“{{name}}” will be permanently deleted. This can’t be undone.', {
            name: target?.name,
          })
        )}
      </ConfirmDialog>
    </section>
  );
}

export default Environments;
