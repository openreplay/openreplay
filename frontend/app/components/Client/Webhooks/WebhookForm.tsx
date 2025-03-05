import React from 'react';
import { Input } from 'UI';
import { Button, Form } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { TrashIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose: () => void;
  onDelete: (id: string) => void;
}

function WebhookForm({ onClose, onDelete }: Props) {
  const { t } = useTranslation();
  const { settingsStore } = useStore();
  const {
    webhookInst: webhook,
    saveWebhook,
    editWebhook,
    saving,
  } = settingsStore;
  const write = ({ target: { value, name } }) => editWebhook({ [name]: value });

  const save = () => {
    saveWebhook(webhook)
      .then(() => {
        onClose();
      })
      .catch((e) => {
        toast.error(e.message || t('Failed to save webhook'));
      });
  };

  return (
    <Form onFinish={save} layout="vertical">
      <Form.Item>
        <label>{t('Name')}</label>
        <Input
          name="name"
          defaultValue={webhook.name}
          onChange={write}
          placeholder={t('Name')}
          maxLength={50}
        />
      </Form.Item>

      <Form.Item>
        <label>{t('Endpoint')}</label>
        <Input
          name="endpoint"
          defaultValue={webhook.endpoint}
          onChange={write}
          placeholder={t('Endpoint')}
        />
      </Form.Item>

      <Form.Item>
        <label>{t('Auth Header (optional)')}</label>
        <Input
          name="authHeader"
          defaultValue={webhook.authHeader}
          onChange={write}
          placeholder={t('Auth Header')}
        />
      </Form.Item>

      <div className="flex justify-between">
        <div className="flex items-center">
          <Button
            // onClick={save}
            disabled={!webhook.validate()}
            loading={saving}
            type="primary"
            htmlType="submit"
            className="float-left mr-2"
          >
            {webhook.exists() ? t('Update') : t('Add')}
          </Button>
          {webhook.exists() && <Button onClick={onClose}>{t('Cancel')}</Button>}
        </div>
        {webhook.exists() && (
          <Button
            icon={<TrashIcon size={16} />}
            type="text"
            onClick={() => onDelete(webhook.webhookId)}
          />
        )}
      </div>
    </Form>
  );
}

export default observer(WebhookForm);
