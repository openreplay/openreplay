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
import { toast } from ".store/react-toastify-virtual-9dd0f3eae1/package";

interface DynatraceConfig {
  environment: string;
  client_id: string;
  client_secret: string;
  resource: string;
}

const initialValues = {
  environment: '',
  client_id: '',
  client_secret: '',
  resource: '',
};
const DynatraceFormModal = ({
  onClose,
  integrated,
}: {
  onClose: () => void;
  integrated: boolean;
}) => {
  const { integrationsStore } = useStore();
  const siteId = integrationsStore.integrations.siteId;
  const {
    data = initialValues,
    isPending,
    saveMutation,
    removeMutation,
  } = useIntegration<DynatraceConfig>('dynatrace', siteId, initialValues);
  const { values, errors, handleChange, hasErrors, checkErrors } = useForm(data, {
    environment: {
      required: true,
    },
    client_id: {
      required: true,
    },
    client_secret: {
      required: true,
    },
    resource: {
      required: true,
    },
  });
  const exists = Boolean(data.client_id);

  const save = async () => {
    if (checkErrors()) {
      return;
    }
    try {
      await saveMutation.mutateAsync({ values, siteId, exists });
    } catch (e) {
      console.error(e)
    }
    onClose();
  };

  const remove = async () => {
    try {
      await removeMutation.mutateAsync({ siteId });
    } catch (e) {
      console.error(e)
    }
    onClose();
  };
  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '350px' }}
    >
      <IntegrationModalCard
        title="Dynatrace"
        icon="integrations/dynatrace"
        useIcon
        description="Integrate Dynatrace with session replays to link backend logs with user sessions for faster issue resolution."
      />
      <div className="p-5 border-b mb-4">
        <div className="font-medium mb-1">How it works?</div>
        <ol className="list-decimal list-inside">
          <li>
            Enter your Environment ID, Client ID, Client Secret, and Account URN
            in the form below.
          </li>
          <li>
            Create a custom Log attribute openReplaySessionToken in Dynatrace.
          </li>
          <li>
            Propagate openReplaySessionToken in your application's backend logs.
          </li>
        </ol>
        <DocLink
          className="mt-4"
          label="See detailed steps"
          url="https://docs.openreplay.com/integrations/dynatrace"
        />
        <Loader loading={isPending}>
          <FormField
            label="Environment ID"
            name="environment"
            value={values.environment}
            onChange={handleChange}
            errors={errors.environment}
            autoFocus
          />
          <FormField
            label="Client ID"
            name="client_id"
            value={values.client_id}
            onChange={handleChange}
            errors={errors.client_id}
          />
          <FormField
            label="Client Secret"
            name="client_secret"
            value={values.client_secret}
            onChange={handleChange}
            errors={errors.client_secret}
          />
          <FormField
            label="Dynatrace Account URN"
            name="resource"
            value={values.resource}
            onChange={handleChange}
            errors={errors.resource}
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

DynatraceFormModal.displayName = 'DynatraceFormModal';

export default observer(DynatraceFormModal);
