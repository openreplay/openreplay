import React from 'react';
import { Input } from 'UI';
import { Button, Form } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { TrashIcon } from 'lucide-react';

interface Props {
  onClose: () => void;
  onDelete: (id: string) => void;
}

function WebhookForm({ onClose, onDelete }: Props) {
  const { settingsStore } = useStore();
  const { webhookInst: webhook, saveWebhook, editWebhook, saving } = settingsStore;
  const write = ({ target: { value, name } }) => editWebhook({ [name]: value });

  const save = () => {
    saveWebhook(webhook)
      .then(() => {
        onClose();
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to save webhook');
      });
  };

  return (
    <Form onFinish={save} layout="vertical">
      <Form.Item>
        <label>{'Name'}</label>
        <Input
          name="name"
          defaultValue={webhook.name}
          onChange={write}
          placeholder="Name"
          maxLength={50}
        />
      </Form.Item>

      <Form.Item>
        <label>{'Endpoint'}</label>
        <Input name="endpoint" defaultValue={webhook.endpoint} onChange={write} placeholder="Endpoint" />
      </Form.Item>

      <Form.Item>
        <label>{'Auth Header (optional)'}</label>
        <Input
          name="authHeader"
          defaultValue={webhook.authHeader}
          onChange={write}
          placeholder="Auth Header"
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
            {webhook.exists() ? 'Update' : 'Add'}
          </Button>
          {webhook.exists() && <Button onClick={onClose}>{'Cancel'}</Button>}
        </div>
        {webhook.exists() && (
          <Button
            icon={<TrashIcon size={16} />}
            type="text"
            onClick={() => onDelete(webhook.webhookId)}
          ></Button>
        )}
      </div>
    </Form>
  );
}

export default observer(WebhookForm);
