import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import FormField from 'App/components/Client/Integrations/FormField';
import { useIntegration } from 'App/components/Client/Integrations/apiMethods';
import useForm from 'App/hooks/useForm';
import { useStore } from 'App/mstore';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

import DocLink from 'Shared/DocLink/DocLink';

interface ElasticConfig {
  url: string;
  api_key_id: string;
  api_key: string;
  indexes: string;
}

const initialValues = {
  url: '',
  api_key_id: '',
  api_key: '',
  indexes: '',
};

function ElasticsearchForm({
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
  } = useIntegration<ElasticConfig>('elasticsearch', siteId, initialValues);
  const { values, errors, handleChange, hasErrors, checkErrors } = useForm(
    data,
    {
      url: {
        required: true,
      },
      api_key_id: {
        required: true,
      },
      api_key: {
        required: true,
      },
    },
  );
  const exists = Boolean(data.api_key_id);

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
        title="Elasticsearch"
        icon="integrations/elasticsearch"
        description={t(
          'Integrate Elasticsearch with session replays to seamlessly observe backend errors.',
        )}
      />

      <div className="p-5 border-b mb-4">
        <div className="font-medium mb-1">{t('How it works?')}</div>
        <ol className="list-decimal list-inside">
          <li>{t('Create a new Elastic API key')}</li>
          <li>{t('Enter the API key below')}</li>
          <li>{t('Propagate openReplaySession.id')}</li>
        </ol>
        <DocLink
          className="mt-4"
          label={t('Integrate Elasticsearch')}
          url="https://docs.openreplay.com/integrations/elastic"
        />
        <Loader loading={isPending}>
          <FormField
            label={t('URL')}
            name="url"
            value={values.url}
            onChange={handleChange}
            errors={errors.url}
            autoFocus
          />
          <FormField
            label={t('API Key ID')}
            name="api_key_id"
            value={values.api_key_id}
            onChange={handleChange}
            errors={errors.api_key_id}
          />
          <FormField
            label={t('API Key')}
            name="api_key"
            value={values.api_key}
            onChange={handleChange}
            errors={errors.api_key}
          />
          <FormField
            label={t('Indexes')}
            name="indexes"
            value={values.indexes}
            onChange={handleChange}
            errors={errors.indexes}
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

export default observer(ElasticsearchForm);
