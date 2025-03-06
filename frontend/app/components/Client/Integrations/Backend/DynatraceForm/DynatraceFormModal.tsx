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
function DynatraceFormModal({
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
  } = useIntegration<DynatraceConfig>('dynatrace', siteId, initialValues);
  const { values, errors, handleChange, hasErrors, checkErrors } = useForm(
    data,
    {
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
    },
  );
  const exists = Boolean(data.client_id);

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
        title={t('Dynatrace')}
        icon="integrations/dynatrace"
        useIcon
        description={t(
          'Integrate Dynatrace with session replays to link backend logs with user sessions for faster issue resolution.',
        )}
      />
      <div className="p-5 border-b mb-4">
        <div className="font-medium mb-1">{t('How it works?')}</div>
        <ol className="list-decimal list-inside">
          <li>
            {t(
              'Enter your Environment ID, Client ID, Client Secret, and Account URN in the form below.',
            )}
          </li>
          <li>
            {t(
              'Create a custom Log attribute openReplaySessionToken in Dynatrace.',
            )}
          </li>
          <li>
            {t(
              "Propagate openReplaySessionToken in your application's backend logs.",
            )}
          </li>
        </ol>
        <DocLink
          className="mt-4"
          label={t('See detailed steps')}
          url="https://docs.openreplay.com/integrations/dynatrace"
        />
        <Loader loading={isPending}>
          <FormField
            label={t('Environment ID')}
            name="environment"
            value={values.environment}
            onChange={handleChange}
            errors={errors.environment}
            autoFocus
          />
          <FormField
            label={t('Client ID')}
            name="client_id"
            value={values.client_id}
            onChange={handleChange}
            errors={errors.client_id}
          />
          <FormField
            label={t('Client Secret')}
            name="client_secret"
            value={values.client_secret}
            onChange={handleChange}
            errors={errors.client_secret}
          />
          <FormField
            label={t('Dynatrace Account URN')}
            name="resource"
            value={values.resource}
            onChange={handleChange}
            errors={errors.resource}
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

DynatraceFormModal.displayName = 'DynatraceFormModal';

export default observer(DynatraceFormModal);
