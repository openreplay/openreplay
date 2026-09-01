import usePageTitle from '@/hooks/usePageTitle';
import { IWebhook } from 'Types/webhook';
import { App, Button, List, Space, Typography } from 'antd';
import { PencilIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { useModal } from 'Components/ModalContext';
import { Icon, Loader, NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import PreferencesPage from '../PreferencesPage';
import WebhookForm from './WebhookForm';

function Webhooks() {
  const { t } = useTranslation();
  const { settingsStore } = useStore();
  const { webhooks, hooksLoading: loading } = settingsStore;
  const { openModal, closeModal } = useModal();
  const { modal } = App.useApp();
  usePageTitle('Webhooks - OpenReplay Preferences');
  const customWebhooks = webhooks.filter((h) => h.type === 'webhook');

  useEffect(() => {
    void settingsStore.fetchWebhooks();
  }, []);

  const init = (w?: Partial<IWebhook>) => {
    settingsStore.initWebhook({ ...w });
    openModal(<WebhookForm onClose={closeModal} onDelete={removeWebhook} />, {
      title: w ? t('Edit Webhook') : t('Add Webhook'),
    });
  };

  const removeWebhook = async (id: string) => {
    modal.confirm({
      title: t('Confirm'),
      content: t('Are you sure you want to remove this webhook?'),
      onOk: () => {
        settingsStore
          .removeWebhook(id)
          .then(() => toast.success(t('Webhook removed successfully')));
        closeModal();
      },
    });
  };

  return (
    <PreferencesPage
      title={t('Webhooks')}
      actions={
        <Button type="primary" size="small" onClick={() => init()}>
          {t('Add Webhook')}
        </Button>
      }
    >
      {/* the hint used to sit under the title; the header row is one fixed
          height now, so it leads the body instead */}
      <Typography.Text type="secondary" className="block mb-4">
        <Space>
          <Icon name="info-circle-fill" size={16} />
          {t(
            'Leverage webhook notifications on alerts to trigger custom callbacks.',
          )}
        </Space>
      </Typography.Text>

      <Loader loading={loading}>
        <NoContent
          title={
            <div className="flex flex-col items-center justify-center">
              <AnimatedSVG name={ICONS.NO_WEBHOOKS} size={60} />
              <div className="text-center my-4">{t('None added yet')}</div>
            </div>
          }
          size="small"
          show={customWebhooks.length === 0}
        >
          <List
            size="small"
            dataSource={customWebhooks}
            renderItem={(w) => (
              <List.Item
                onClick={() => init(w)}
                className="p-2! group flex justify-between items-center cursor-pointer hover:bg-active-blue transition"
              >
                <Space
                  direction="vertical"
                  className="overflow-hidden! w-full!"
                >
                  <Typography.Text style={{ textTransform: 'capitalize' }}>
                    {w.name}
                  </Typography.Text>
                  <Typography.Text
                    type="secondary"
                    ellipsis={{ tooltip: w.endpoint }}
                    style={{
                      width: '90%',
                      display: 'inline-block',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {w.endpoint}
                  </Typography.Text>
                </Space>
                <Button
                  type="text"
                  className="invisible group-hover:visible"
                  icon={<PencilIcon size={16} />}
                />
              </List.Item>
            )}
          />
        </NoContent>
      </Loader>
    </PreferencesPage>
  );
}

export default observer(Webhooks);
