import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { confirm, Form, Input, Message } from 'UI';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose: () => void;
}

function TeamsAddForm({ onClose }: Props) {
  const { t } = useTranslation();
  const { integrationsStore } = useStore();
  const { instance } = integrationsStore.msteams;
  const saving = integrationsStore.msteams.loading;
  const { errors } = integrationsStore.msteams;
  const { edit } = integrationsStore.msteams;
  const onSave = integrationsStore.msteams.saveIntegration;
  const { init } = integrationsStore.msteams;
  const onRemove = integrationsStore.msteams.removeInt;
  const { update } = integrationsStore.msteams;

  React.useEffect(() => () => init({}), []);

  const save = () => {
    if (instance?.exists()) {
      update().then(() => {
        void onClose();
      });
    } else {
      void onSave().then(() => {
        void onClose();
      });
    }
  };

  const remove = async (id: string) => {
    if (
      await confirm({
        header: t('Confirm'),
        confirmButton: t('Yes, delete'),
        confirmation: t(
          'Are you sure you want to permanently delete this channel?',
        ),
      })
    ) {
      void onRemove(id).then(onClose);
    }
  };

  const write = ({
    target: { name, value },
  }: {
    target: { name: string; value: string };
  }) => edit({ [name]: value });

  return (
    <div className="p-5" style={{ minWidth: '300px' }}>
      <Form>
        <Form.Field>
          <label>{t('Name')}</label>
          <Input
            name="name"
            value={instance?.name}
            onChange={write}
            placeholder={t('Enter any name')}
            type="text"
          />
        </Form.Field>
        <Form.Field>
          <label>{t('URL')}</label>
          <Input
            name="endpoint"
            value={instance?.endpoint}
            onChange={write}
            placeholder={t('Teams webhook URL')}
            type="text"
          />
        </Form.Field>
        <div className="flex justify-between">
          <div className="flex">
            <Button
              onClick={save}
              disabled={!instance?.validate()}
              loading={saving}
              type="primary"
              className="float-left mr-2"
            >
              {instance?.exists() ? t('Update') : t('Add')}
            </Button>

            <Button onClick={onClose}>{t('Cancel')}</Button>
          </div>

          <Button
            onClick={() => remove(instance?.webhookId)}
            disabled={!instance.exists()}
          >
            {t('Delete')}
          </Button>
        </div>
      </Form>

      {errors && (
        <div className="my-3">
          {errors.map((error: any) => (
            <Message visible={errors} key={error}>
              {error}
            </Message>
          ))}
        </div>
      )}
    </div>
  );
}

export default observer(TeamsAddForm);
