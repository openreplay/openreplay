import React from 'react';
import { Input } from 'UI';
import { Button, Form } from 'antd';
import styles from './webhookForm.module.css';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';

function WebhookForm(props) {
  const { settingsStore } = useStore();
  const { webhookInst: webhook, saveWebhook, editWebhook, saving } = settingsStore;
  const write = ({ target: { value, name } }) => editWebhook({ [name]: value });

  const save = () => {
    saveWebhook(webhook)
      .then(() => {
        props.onClose();
      })
      .catch((e) => {
        toast.error(e.message || 'Failed to save webhook');
      });
  };

  return (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
      <h3 className="p-5 text-2xl">{webhook.exists() ? 'Update' : 'Add'} Webhook</h3>
      <Form className={styles.wrapper}>
        <Form.Item>
          <label>{'Name'}</label>
          <Input
            name="name"
            value={webhook.name}
            onChange={write}
            placeholder="Name"
            maxLength={50}
          />
        </Form.Item>

        <Form.Item>
          <label>{'Endpoint'}</label>
          <Input name="endpoint" value={webhook.endpoint} onChange={write} placeholder="Endpoint" />
        </Form.Item>

        <Form.Item>
          <label>{'Auth Header (optional)'}</label>
          <Input
            name="authHeader"
            value={webhook.authHeader}
            onChange={write}
            placeholder="Auth Header"
          />
        </Form.Item>

        <div className="flex justify-between">
          <div className="flex items-center">
            <Button
              onClick={save}
              disabled={!webhook.validate()}
              loading={saving}
              type="primary"
              className="float-left mr-2"
            >
              {webhook.exists() ? 'Update' : 'Add'}
            </Button>
            {webhook.exists() && <Button onClick={props.onClose}>{'Cancel'}</Button>}
          </div>
          {webhook.exists() && (
            <Button
              icon="trash"
              type="text"
              onClick={() => props.onDelete(webhook.webhookId)}
            ></Button>
          )}
        </div>
      </Form>
    </div>
  );
}

export default observer(WebhookForm);
