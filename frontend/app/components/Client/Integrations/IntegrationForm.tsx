import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { namedStore } from 'App/mstore/integrationsStore';
import { Checkbox, Form, Input, Loader } from 'UI';
import { Button } from 'antd';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

function IntegrationForm(props: any) {
  const { t } = useTranslation();
  const { formFields, name, integrated } = props;
  const { integrationsStore } = useStore();
  const initialSiteId = integrationsStore.integrations.siteId;
  const integrationStore = integrationsStore[name as unknown as namedStore];
  const config = integrationStore.instance;
  const { loading } = integrationStore;
  const onSave = integrationStore.saveIntegration;
  const onRemove = integrationStore.deleteIntegration;
  const { edit } = integrationStore;
  const fetchIntegrationList = integrationsStore.integrations.fetchIntegrations;

  const fetchList = () => {
    void fetchIntegrationList(initialSiteId);
  };

  const write = ({ target: { value, name: key, type, checked } }) => {
    if (type === 'checkbox') edit({ [key]: checked });
    else edit({ [key]: value });
  };

  const save = () => {
    const { name, customPath } = props;
    onSave(customPath || name)
      .then(() => {
        fetchList();
        props.onClose();
      })
      .catch(async (error) => {
        if (error.response) {
          const errorResponse = await error.response.json();
          if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
            toast.error(errorResponse.errors.map((e: any) => e).join(', '));
          } else {
            toast.error(t('Failed to save integration'));
          }
        }
      });
  };

  const remove = () => {
    onRemove().then(() => {
      props.onClose();
      fetchList();
    });
  };

  return (
    <Loader loading={loading}>
      <div className="ph-20">
        <Form>
          {formFields.map(
            ({
              key,
              label,
              placeholder = label,
              component: Component = 'input',
              type = 'text',
              checkIfDisplayed,
              autoFocus = false,
            }) =>
              (typeof checkIfDisplayed !== 'function' ||
                checkIfDisplayed(config)) &&
              (type === 'checkbox' ? (
                <Form.Field key={key}>
                  <Checkbox
                    label={label}
                    name={key}
                    value={config[key]}
                    onChange={write}
                    placeholder={placeholder}
                    type={Component === 'input' ? type : null}
                  />
                </Form.Field>
              ) : (
                <Form.Field key={key}>
                  <label>{label}</label>
                  <Input
                    name={key}
                    value={config[key]}
                    onChange={write}
                    placeholder={placeholder}
                    type={Component === 'input' ? type : null}
                    autoFocus={autoFocus}
                  />
                </Form.Field>
              )),
          )}

          <Button
            onClick={save}
            disabled={!config?.validate()}
            loading={loading}
            type="primary"
            className="float-left mr-2"
          >
            {config?.exists() ? t('Update') : t('Add')}
          </Button>

          {integrated && (
            <Button loading={loading} onClick={remove}>
              {t('Delete')}
            </Button>
          )}
        </Form>
      </div>
    </Loader>
  );
}

export default observer(IntegrationForm);
