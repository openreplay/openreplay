import { App, Button, List, Tag, Typography } from 'antd';
import { Globe, PencilIcon, Plus, Trash2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'Components/ModalContext';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { NoContent } from 'UI';

import EnvironmentForm from './EnvironmentForm';
import { kaiStore } from './shared/store';
import { Environment } from './shared/types';

let idCounter = 0;
const nextId = () => `env-new-${(idCounter += 1)}`;

interface Props {
  environments: Environment[];
  setEnvironments: (updater: (prev: Environment[]) => Environment[]) => void;
}

// Environments list — same section pattern as the app's Webhooks / Projects settings:
// a titled header with a primary add action, an antd List with a hover-reveal edit,
// and a NoContent empty state. The add / edit form opens in the standard right drawer.
function Environments({ environments, setEnvironments }: Props) {
  const { t } = useTranslation();
  const { openModal } = useModal();
  const { modal } = App.useApp();

  const openAdd = () =>
    openModal(
      <EnvironmentForm
        onSubmit={(values) =>
          setEnvironments((prev) => [...prev, { id: nextId(), ...values }])
        }
      />,
      { title: t('Add environment') },
    );

  const openEdit = (env: Environment) =>
    openModal(
      <EnvironmentForm
        env={env}
        onSubmit={(values) =>
          setEnvironments((prev) =>
            prev.map((e) => (e.id === env.id ? { ...e, ...values } : e)),
          )
        }
        onDelete={() => confirmDelete(env)}
      />,
      { title: t('Edit environment') },
    );

  // Deleting an environment must never be silent: tests whose ONLY environment this
  // is get paused (their env reads "Not set" until a new one is chosen); tests that
  // run on other environments too just drop this one and keep going.
  const confirmDelete = (env: Environment) => {
    const tests = kaiStore.get().tests;
    const uses = tests.filter((tc) => tc.envNames?.includes(env.name));
    // sole environment + actively scheduled → these are the ones that pause
    const toPause = uses.filter(
      (tc) => tc.envNames?.length === 1 && tc.status === 'active',
    );
    // still have other environments → just lose this one, keep running
    const detachOnly = uses.filter((tc) => (tc.envNames?.length ?? 0) > 1);

    modal.confirm({
      title: t('Delete environment?'),
      okText: toPause.length ? t('Pause tests & delete') : t('Delete'),
      okButtonProps: { danger: true },
      cancelText: t('Cancel'),
      width: 480,
      centered: true,
      content: (
        <div className="flex flex-col gap-4 py-2">
          {toPause.length > 0 ? (
            <>
              <div className="text-sm leading-relaxed">
                {t('“{{name}}” is the only environment for the tests below. Deleting it will pause them — set a new environment on the test to resume.', { name: env.name })}
              </div>
              {/* bounded, visibly scrollable box — the list can be long */}
              <ul
                className="list-disc pl-8 pr-3 py-2.5 text-sm leading-relaxed text-gray-dark max-h-40 overflow-y-auto border rounded-lg bg-gray-lightest"
                style={{ borderColor: 'var(--color-gray-light)' }}
              >
                {toPause.map((tc) => (
                  <li key={tc.key}>{tc.title}</li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-sm leading-relaxed">
              {t('“{{name}}” isn’t the only environment of any active test. This can’t be undone.', { name: env.name })}
            </div>
          )}
          {detachOnly.length > 0 && (
            <div className="text-sm leading-relaxed text-disabled-text">
              {t('It will also be removed from {{count}} tests that run on other environments — those keep running.', { count: detachOnly.length })}
            </div>
          )}
        </div>
      ),
      onOk: () => kaiStore.deleteEnvironment(env),
    });
  };

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
                  icon={<Trash2 size={16} />}
                  aria-label={t('Delete')}
                  onClick={() => confirmDelete(env)}
                />
              </div>
            </List.Item>
          )}
        />
      </NoContent>
    </div>
  );
}

export default Environments;
