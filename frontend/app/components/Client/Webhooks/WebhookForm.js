import React from 'react';
import { Form, Button, Input } from 'UI';
import styles from './webhookForm.module.css';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';

function WebhookForm(props) {
  const { settingsStore } = useStore();
  const { webhookInst: webhook, hooksLoading: loading, saveWebhook, editWebhook } = settingsStore;
  const write = ({ target: { value, name } }) => editWebhook({ [name]: value });

  const save = () => {
    saveWebhook(webhook)
      .then(() => {
        props.onClose();
      })
      .catch((e) => {
        const baseStr = 'Error saving webhook';
        if (e.response) {
          e.response.json().then(({ errors }) => {
            toast.error(baseStr + ': ' + errors.join(','));
          });
        } else {
          toast.error(baseStr);
        }
      });
  };

  return (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
      <h3 className="p-5 text-2xl">{webhook.exists() ? 'Update' : 'Add'} Webhook</h3>
      <Form className={styles.wrapper}>
        <Form.Field>
          <label>{'Name'}</label>
          <Input
            name="name"
            value={webhook.name}
            onChange={write}
            placeholder="Name"
            maxLength={50}
          />
        </Form.Field>

        <Form.Field>
          <label>{'Endpoint'}</label>
          <Input name="endpoint" value={webhook.endpoint} onChange={write} placeholder="Endpoint" />
        </Form.Field>

        <Form.Field>
          <label>{'Auth Header (optional)'}</label>
          <Input
            name="authHeader"
            value={webhook.authHeader}
            onChange={write}
            placeholder="Auth Header"
          />
        </Form.Field>

        <div className="flex justify-between">
          <div className="flex items-center">
            <Button
              onClick={save}
              disabled={!webhook.validate()}
              loading={loading}
              variant="primary"
              className="float-left mr-2"
            >
              {webhook.exists() ? 'Update' : 'Add'}
            </Button>
            {webhook.exists() && <Button onClick={props.onClose}>{'Cancel'}</Button>}
          </div>
          {webhook.exists() && (
            <Button
              icon="trash"
              variant="text"
              onClick={() => props.onDelete(webhook.webhookId)}
            ></Button>
          )}
        </div>
      </Form>
    </div>
  );
}

export default observer(WebhookForm);
