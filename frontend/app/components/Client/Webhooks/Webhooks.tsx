import React, { useEffect } from 'react';
import { Loader, NoContent, Icon } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { IWebhook } from 'Types/webhook';
import { App, List, Button, Typography, Space } from 'antd';
import { PencilIcon } from 'lucide-react';
import usePageTitle from '@/hooks/usePageTitle';
import { useModal } from 'Components/ModalContext';
import WebhookForm from './WebhookForm';
import { useTranslation } from 'react-i18next';

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
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Typography.Title level={4} style={{ marginBottom: 0 }}>
            {t('Webhooks')}
          </Typography.Title>
          <Typography.Text type="secondary">
            <Space>
              <Icon name="info-circle-fill" size={16} />
              {t(
                'Leverage webhook notifications on alerts to trigger custom callbacks.',
              )}
            </Space>
          </Typography.Text>
        </div>
        <Button type="primary" onClick={() => init()}>
          {t('Add Webhook')}
        </Button>
      </div>

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
                <Space direction="vertical" className="overflow-hidden w-full">
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
    </div>
  );
}

export default observer(Webhooks);
