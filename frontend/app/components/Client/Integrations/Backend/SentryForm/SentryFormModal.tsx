import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import { toast } from '@/ui/overlays/toast';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import FormField from 'App/components/Client/Integrations/FormField';
import { useIntegration } from 'App/components/Client/Integrations/apiMethods';
import useForm from 'App/hooks/useForm';
import { useStore } from 'App/mstore';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

import DocLink from 'Shared/DocLink/DocLink';

interface SentryConfig {
  url: string;
  organization_slug: string;
  project_slug: string;
  token: string;
}

const initialValues = {
  url: 'https://sentry.io',
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
  const { t } = useTranslation();
  const { integrationsStore } = useStore();
  const { siteId } = integrationsStore.integrations;
  const {
    data = initialValues,
    isPending,
    saveMutation,
    removeMutation,
  } = useIntegration<SentryConfig>('sentry', siteId, initialValues);
  const { values, errors, handleChange, hasErrors, checkErrors } = useForm(
    data,
    {
      url: {
        required: false,
      },
      organization_slug: {
        required: true,
      },
      project_slug: {
        required: true,
      },
      token: {
        required: true,
      },
    },
  );
  const exists = Boolean(data.token);

  const save = async () => {
    if (checkErrors()) {
      return;
    }
    // a failed save keeps the drawer, and what was typed, open (the reason is toasted)
    const saved = await saveMutation
      .mutateAsync({ values, siteId, exists })
      .catch((e) => {
        console.error(e);
        return false;
      });
    if (saved) onClose();
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
    <div className="bg-surface-default">
      <IntegrationModalCard
        title="Sentry"
        icon="integrations/sentry"
        description="Integrate Sentry with session replays to seamlessly observe backend errors."
      />
      <div className="p-5 border-b mb-4">
        <div className="font-medium mb-1">{t('How it works?')}</div>
        <ol className="list-decimal list-inside">
          <li>{t('Generate Sentry Auth Token')}</li>
          <li>{t('Enter the token below')}</li>
          <li>{t('Propagate openReplaySession.id')}</li>
        </ol>
        <DocLink
          className="mt-4"
          label={t('See detailed steps')}
          url="https://docs.openreplay.com/integrations/sentry"
        />

        <Loader loading={isPending}>
          <FormField
            label={t('URL')}
            name="url"
            value={values.url}
            onChange={handleChange}
            errors={errors.url}
          />
          <FormField
            label={t('Organization Slug')}
            name="organization_slug"
            value={values.organization_slug}
            onChange={handleChange}
            errors={errors.organization_slug}
            autoFocus
          />
          <FormField
            label={t('Project Slug')}
            name="project_slug"
            value={values.project_slug}
            onChange={handleChange}
            errors={errors.project_slug}
          />
          <FormField
            label={t('Token')}
            name="token"
            value={values.token}
            onChange={handleChange}
            errors={errors.token}
          />

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={save}
              disabled={hasErrors}
              loading={saveMutation.isPending}
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

export default observer(SentryForm);
