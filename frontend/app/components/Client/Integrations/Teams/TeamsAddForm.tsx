import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { Button, Form, Input, Message } from 'UI';
import { confirm } from 'UI';

interface Props {
  onClose: () => void;
}

function TeamsAddForm({ onClose }: Props) {
  const { integrationsStore } = useStore();
  const instance = integrationsStore.msteams.instance;
  const saving = integrationsStore.msteams.loading;
  const errors = integrationsStore.msteams.errors;
  const edit = integrationsStore.msteams.edit;
  const onSave = integrationsStore.msteams.saveIntegration;
  const init = integrationsStore.msteams.init;
  const onRemove = integrationsStore.msteams.removeInt;
  const update = integrationsStore.msteams.update;

  React.useEffect(() => {
    return () => init({});
  }, []);

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
        header: 'Confirm',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to permanently delete this channel?`
      })
    ) {
      void onRemove(id).then(onClose);
    }
  };

  const write = ({
                   target: { name, value }
                 }: {
    target: { name: string; value: string };
  }) => edit({ [name]: value });

  return (
    <div className="p-5" style={{ minWidth: '300px' }}>
      <Form>
        <Form.Field>
          <label>Name</label>
          <Input
            name="name"
            value={instance?.name}
            onChange={write}
            placeholder="Enter any name"
            type="text"
          />
        </Form.Field>
        <Form.Field>
          <label>URL</label>
          <Input
            name="endpoint"
            value={instance?.endpoint}
            onChange={write}
            placeholder="Teams webhook URL"
            type="text"
          />
        </Form.Field>
        <div className="flex justify-between">
          <div className="flex">
            <Button
              onClick={save}
              disabled={!instance?.validate()}
              loading={saving}
              variant="primary"
              className="float-left mr-2"
            >
              {instance?.exists() ? 'Update' : 'Add'}
            </Button>

            <Button onClick={onClose}>{'Cancel'}</Button>
          </div>

          <Button
            onClick={() => remove(instance?.webhookId)}
            disabled={!instance.exists()}
          >
            {'Delete'}
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
