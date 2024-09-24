import React from 'react';
import { Form, Input, Button, Message } from 'UI';
import { confirm } from 'UI';
import { observer } from 'mobx-react-lite'
import { useStore } from 'App/mstore'

function SlackAddForm(props) {
  const { onClose } = props;
  const { integrationsStore } = useStore();
  const instance = integrationsStore.slack.instance;
  const saving = integrationsStore.slack.loading;
  const errors = integrationsStore.slack.errors;
  const edit = integrationsStore.slack.edit;
  const onSave = integrationsStore.slack.saveIntegration;
  const update = integrationsStore.slack.update;
  const init = integrationsStore.slack.init;
  const onRemove = integrationsStore.slack.removeInt;
  
  React.useEffect(() => {
    return () => init({})
  }, [])


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
        header: 'Confirm',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to permanently delete this channel?`,
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
          <label>Name</label>
          <Input
            name="name"
            value={instance.name}
            onChange={write}
            placeholder="Enter any name"
            type="text"
          />
        </Form.Field>
        <Form.Field>
          <label>URL</label>
          <Input
            name="endpoint"
            value={instance.endpoint}
            onChange={write}
            placeholder="Slack webhook URL"
            type="text"
          />
        </Form.Field>
        <div className="flex justify-between">
          <div className="flex">
            <Button
              onClick={save}
              disabled={!instance.validate()}
              loading={saving}
              variant="primary"
              className="float-left mr-2"
            >
              {instance.exists() ? 'Update' : 'Add'}
            </Button>

            <Button onClick={onClose}>{'Cancel'}</Button>
          </div>

          <Button onClick={() => remove(instance.webhookId)} disabled={!instance.exists()}>
            {'Delete'}
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
