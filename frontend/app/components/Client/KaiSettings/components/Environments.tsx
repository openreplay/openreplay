import { Button, Tag, Typography } from 'antd';
import { Globe, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'Components/ModalContext';

import EnvironmentForm from './EnvironmentForm';
import { MOCK_ENVIRONMENTS } from './shared/mockData';
import { Environment } from './shared/types';

let idCounter = 0;
const nextId = () => `env-new-${(idCounter += 1)}`;

function Environments() {
  const { t } = useTranslation();
  const { openModal } = useModal();
  const [environments, setEnvironments] = useState<Environment[]>(
    MOCK_ENVIRONMENTS,
  );

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
        onDelete={() =>
          setEnvironments((prev) => prev.filter((e) => e.id !== env.id))
        }
      />,
      { title: t('Edit environment') },
    );

  const handleDelete = (id: string) =>
    setEnvironments((prev) => prev.filter((e) => e.id !== id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography.Text strong>{t('Environments')}</Typography.Text>
        <Button size="small" icon={<Plus size={14} />} onClick={openAdd}>
          {t('Add environment')}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {environments.length === 0 && (
          <Typography.Text type="secondary" className="text-sm!">
            {t('No environments yet. Add one to get started.')}
          </Typography.Text>
        )}
        {environments.map((env) => (
          <div
            key={env.id}
            className="border rounded-lg px-3 py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-active-blue"
            onClick={() => openEdit(env)}
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
                {env.ignoreHttpsErrors && <Tag>{t('Ignores SSL errors')}</Tag>}
              </div>
              <div className="flex items-center gap-1 text-sm text-disabled-text truncate">
                <Globe size={12} />
                <span className="truncate">{env.url}</span>
              </div>
            </div>
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="text"
                size="small"
                icon={<Pencil size={14} />}
                aria-label={t('Edit')}
                onClick={() => openEdit(env)}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<Trash2 size={14} />}
                aria-label={t('Delete')}
                onClick={() => handleDelete(env.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Environments;
