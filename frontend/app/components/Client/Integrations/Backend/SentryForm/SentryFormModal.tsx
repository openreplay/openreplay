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

interface SentryConfig {
  organization_slug: string;
  project_slug: string;
  token: string;
}

const initialValues = {
  organization_slug: '',
  project_slug: '',
  token: '',
};

function SentryForm({
  onClose,
  integrated,
}: {
  onClose: () => void;
  integrated: boolean;
}) {
  const { integrationsStore } = useStore();
  const siteId = integrationsStore.integrations.siteId;
  const {
    data = initialValues,
    isPending,
    saveMutation,
    removeMutation,
    checkErrors,
  } = useIntegration<SentryConfig>('sentry', siteId, initialValues);
  const { values, errors, handleChange, hasErrors } = useForm(data, {
    organization_slug: {
      required: true,
    },
    project_slug: {
      required: true,
    },
    token: {
      required: true,
    },
  });
  const exists = Boolean(data.token);

  const save = async () => {
    if (checkErrors()) {
      return;
    }
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
        title="Sentry"
        icon="integrations/sentry"
        description="Integrate Sentry with session replays to seamlessly observe backend errors."
      />
      <div className="p-5 border-b mb-4">
        <div className="font-medium mb-1">How it works?</div>
        <ol className="list-decimal list-inside">
          <li>Generate Sentry Auth Token</li>
          <li>Enter the token below</li>
          <li>Propagate openReplaySessionToken</li>
        </ol>
        <DocLink
          className="mt-4"
          label="See detailed steps"
          url="https://docs.openreplay.com/integrations/sentry"
        />

        <Loader loading={isPending}>
          <FormField
            label="Organization Slug"
            name="organization_slug"
            value={values.organization_slug}
            onChange={handleChange}
            errors={errors.url}
            autoFocus
          />
          <FormField
            label="Project Slug"
            name="project_slug"
            value={values.project_slug}
            onChange={handleChange}
            errors={errors.project_slug}
          />
          <FormField
            label="Token"
            name="token"
            value={values.token}
            onChange={handleChange}
            errors={errors.token}
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
}

export default observer(SentryForm);
