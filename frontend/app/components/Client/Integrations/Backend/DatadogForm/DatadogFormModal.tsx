import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import FormField from 'App/components/Client/Integrations/FormField';
import { useIntegration } from 'App/components/Client/Integrations/apiMethods';
import useForm from 'App/hooks/useForm';
import { useStore } from 'App/mstore';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';
import { Loader } from 'UI';

import DocLink from 'Shared/DocLink/DocLink';
import { useTranslation } from 'react-i18next';

interface DatadogConfig {
  site: string;
  api_key: string;
  app_key: string;
}

const initialValues = {
  site: '',
  api_key: '',
  app_key: '',
};

function DatadogFormModal({
  onClose,
  integrated,
}: {
  onClose: () => void;
  integrated: boolean;
}) {
  const { t } = useTranslation();
  const { integrationsStore } = useStore();
  const { siteId } = integrationsStore.integrations;

  const {
    data = initialValues,
    isPending,
    saveMutation,
    removeMutation,
  } = useIntegration<DatadogConfig>('datadog', siteId, initialValues);
  const { values, errors, handleChange, hasErrors, checkErrors } = useForm(
    data,
    {
      site: {
        required: true,
      },
      api_key: {
        required: true,
      },
      app_key: {
        required: true,
      },
    },
  );
  const exists = Boolean(data.api_key);

  const save = async () => {
    if (checkErrors()) {
      return;
    }
    try {
      await saveMutation.mutateAsync({ values, siteId, exists });
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  const remove = async () => {
    try {
      await removeMutation.mutateAsync({ siteId });
    } catch (e) {
      console.error(e);
    }
    onClose();
  };
  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '350px' }}
    >
      <IntegrationModalCard
        title="Datadog"
        icon="integrations/datadog"
        description="Incorporate DataDog to visualize backend errors alongside session replay, for easy troubleshooting."
      />
      <div className="p-5 border-b mb-4">
        <div className="font-medium mb-1">{t('How it works?')}</div>
        <ol className="list-decimal list-inside">
          <li>{t('Generate Datadog API Key & Application Key')}</li>
          <li>{t('Enter the API key below')}</li>
          <li>{t('Propagate openReplaySessionToken')}</li>
        </ol>
        <DocLink
          className="mt-4"
          label={t('Integrate Datadog')}
          url="https://docs.openreplay.com/integrations/datadog"
        />
        <Loader loading={isPending}>
          <FormField
            label={t('Site')}
            name="site"
            value={values.site}
            onChange={handleChange}
            autoFocus
            errors={errors.site}
          />
          <FormField
            label={t('API Key')}
            name="api_key"
            value={values.api_key}
            onChange={handleChange}
            errors={errors.api_key}
          />
          <FormField
            label={t('Application Key')}
            name="app_key"
            value={values.app_key}
            onChange={handleChange}
            errors={errors.app_key}
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={save}
              disabled={hasErrors}
              loading={saveMutation.isPending}
              type="primary"
            >
              {exists ? t('Update') : t('Add')}
            </Button>

            {integrated && (
              <Button loading={removeMutation.isPending} onClick={remove}>
                {t('Delete')}
              </Button>
            )}
          </div>
        </Loader>
      </div>
    </div>
  );
}

DatadogFormModal.displayName = 'DatadogForm';

export default observer(DatadogFormModal);
