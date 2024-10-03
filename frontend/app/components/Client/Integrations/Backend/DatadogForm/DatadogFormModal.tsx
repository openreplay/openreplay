import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import FormField from 'App/components/Client/Integrations/FormField';
import {
  getIntegrationData,
  removeIntegration,
  saveIntegration,
} from 'App/components/Client/Integrations/apiMethods';
import useForm from 'App/hooks/useForm';
import { useStore } from 'App/mstore';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';
import { Loader } from 'UI';

import DocLink from 'Shared/DocLink/DocLink';

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

const DatadogFormModal = ({
  onClose,
  integrated,
}: {
  onClose: () => void;
  integrated: boolean;
}) => {
  const { integrationsStore } = useStore();
  const siteId = integrationsStore.integrations.siteId;
  const { data, isPending } = useQuery({
    queryKey: ['integrationData', 'datadog'],
    queryFn: async () => {
      const resp = await getIntegrationData<DatadogConfig>('datadog', siteId);
      if (resp) {
        return resp;
      }
      return initialValues;
    },
    initialData: initialValues,
  });
  const { values, errors, handleChange, hasErrors } = useForm(data, {
    site: {
      required: true,
    },
    api_key: {
      required: true,
    },
    app_key: {
      required: true,
    },
  });
  const exists = Boolean(data.api_key);

  const saveMutation = useMutation({
    mutationFn: ({ values, siteId, exists }: any) =>
      saveIntegration('datadog', values, siteId, exists),
  });
  const removeMutation = useMutation({
    mutationFn: ({ siteId }: any) => removeIntegration('datadog', siteId),
  });

  const save = async () => {
    await saveMutation.mutateAsync({ values, siteId, exists });
    onClose();
  };

  const remove = async () => {
    await removeMutation.mutateAsync({ siteId });
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
        <div className="font-medium mb-1">How it works?</div>
        <ol className="list-decimal list-inside">
          <li>Generate Datadog API Key & Application Key</li>
          <li>Enter the API key below</li>
          <li>Propagate openReplaySessionToken</li>
        </ol>
        <DocLink
          className="mt-4"
          label="Integrate Datadog"
          url="https://docs.openreplay.com/integrations/datadog"
        />
        <Loader loading={isPending}>
          <FormField
            label="Site"
            name="site"
            value={values.site}
            onChange={handleChange}
            autoFocus
            errors={errors.site}
          />
          <FormField
            label="API Key"
            name="api_key"
            value={values.api_key}
            onChange={handleChange}
            errors={errors.api_key}
          />
          <FormField
            label="Application Key"
            name="app_key"
            value={values.app_key}
            onChange={handleChange}
            errors={errors.app_key}
          />
          <div className={'flex items-center gap-2'}>
            <Button
              onClick={save}
              disabled={hasErrors}
              loading={saveMutation.isPending}
              type="primary"
            >
              {exists ? 'Update' : 'Add'}
            </Button>

            {integrated && (
              <Button loading={removeMutation.isPending} onClick={remove}>
                {'Delete'}
              </Button>
            )}
          </div>
        </Loader>
      </div>
    </div>
  );
};

DatadogFormModal.displayName = 'DatadogForm';

export default observer(DatadogFormModal);
