import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import { Checkbox } from '@/ui/inputs/checkbox';
import { Input } from '@/ui/inputs/input';
import { toast } from '@/ui/overlays/toast';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { namedStore } from 'App/mstore/integrationsStore';

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
      <div className="flex flex-col gap-4 px-5">
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
              <label
                key={key}
                className="inline-flex cursor-pointer items-center gap-3 text-sm"
              >
                <Checkbox
                  name={key}
                  checked={!!config[key]}
                  onCheckedChange={(v) => edit({ [key]: v === true })}
                />
                {label}
              </label>
            ) : (
              <div key={key} className="m-dfield">
                <label className="m-dfield__label">{label}</label>
                <Input
                  name={key}
                  value={config[key]}
                  onChange={(e) => edit({ [key]: e.target.value })}
                  placeholder={placeholder}
                  type={Component === 'input' ? type : undefined}
                  autoFocus={autoFocus}
                />
              </div>
            )),
        )}

        <Button
          variant="primary"
          onClick={save}
          disabled={!config?.validate()}
          loading={loading}
          className="float-left mr-2"
        >
          {config?.exists() ? t('Update') : t('Add')}
        </Button>

        {integrated && (
          <Button loading={loading} onClick={remove}>
            {t('Delete')}
          </Button>
        )}
      </div>
    </Loader>
  );
}

export default observer(IntegrationForm);
