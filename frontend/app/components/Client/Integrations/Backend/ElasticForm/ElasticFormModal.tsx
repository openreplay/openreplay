import React from 'react';
import { useTranslation } from 'react-i18next';

import BackendIntegrationDrawer from '../../BackendIntegrationDrawer';

function ElasticsearchForm({
  onClose,
}: {
  onClose?: () => void;
  integrated?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <BackendIntegrationDrawer
      name="elasticsearch"
      title="Elasticsearch"
      icon="integrations/elasticsearch"
      blurb={t(
        'Searches your own Elasticsearch indexes for log lines carrying the session’s openReplaySession.id and puts them on its timeline.',
      )}
      docs="https://docs.openreplay.com/integrations/elastic"
      initialValues={{ url: '', api_key_id: '', api_key: '', indexes: '' }}
      existsKey="api_key_id"
      fields={[
        { key: 'url', label: t('URL') },
        { key: 'api_key_id', label: t('API key ID') },
        { key: 'api_key', label: t('API key'), secret: true },
        {
          key: 'indexes',
          label: t('Indexes'),
          placeholder: 'logs-*',
          optional: true,
        },
      ]}
      onClose={onClose}
    />
  );
}

export default ElasticsearchForm;
