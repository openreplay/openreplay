import React from 'react';
import { Form, Input, Message, confirm } from 'UI';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

function SlackAddForm(props) {
  const { t } = useTranslation();
  const { onClose } = props;
  const { integrationsStore } = useStore();
  const { instance } = integrationsStore.slack;
  const saving = integrationsStore.slack.loading;
  const { errors } = integrationsStore.slack;
  const { edit } = integrationsStore.slack;
  const onSave = integrationsStore.slack.saveIntegration;
  const { update } = integrationsStore.slack;
  const { init } = integrationsStore.slack;
  const onRemove = integrationsStore.slack.removeInt;

  React.useEffect(() => () => init({}), []);

  const save = () => {
    if (instance.exists()) {
      void update(instance);
    } else {
      void onSave(instance);
    }
  };

  const remove = async (id) => {
    if (
      await confirm({
        header: t('Confirm'),
        confirmButton: t('Yes, delete'),
        confirmation: t(
          'Are you sure you want to permanently delete this channel?',
        ),
      })
    ) {
      await onRemove(id);
      onClose();
    }
  };

  const write = ({ target: { name, value } }) => edit({ [name]: value });

  return (
    <div className="p-5" style={{ minWidth: '300px' }}>
      <Form>
        <Form.Field>
          <label>{t('Name')}</label>
          <Input
            name="name"
            value={instance.name}
            onChange={write}
            placeholder={t('Enter any name')}
            type="text"
          />
        </Form.Field>
        <Form.Field>
          <label>{t('URL')}</label>
          <Input
            name="endpoint"
            value={instance.endpoint}
            onChange={write}
            placeholder={t('Slack webhook URL')}
            type="text"
          />
        </Form.Field>
        <div className="flex justify-between">
          <div className="flex">
            <Button
              onClick={save}
              disabled={!instance.validate()}
              loading={saving}
              type="primary"
              className="float-left mr-2"
            >
              {instance.exists() ? t('Update') : t('Add')}
            </Button>

            <Button onClick={onClose}>{t('Cancel')}</Button>
          </div>

          <Button
            onClick={() => remove(instance.webhookId)}
            disabled={!instance.exists()}
          >
            {t('Delete')}
          </Button>
        </div>
      </Form>

      {errors && (
        <div className="my-3">
          {errors.map((error) => (
            <Message visible={errors} size="mini" error key={error}>
              {error}
            </Message>
          ))}
        </div>
      )}
    </div>
  );
}

export default observer(SlackAddForm);
