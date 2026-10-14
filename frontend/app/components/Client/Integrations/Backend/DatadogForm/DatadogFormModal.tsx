import React from 'react';
import { useTranslation } from 'react-i18next';

import BackendIntegrationDrawer from '../../BackendIntegrationDrawer';

function DatadogFormModal({
  onClose,
}: {
  onClose?: () => void;
  integrated?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <BackendIntegrationDrawer
      name="datadog"
      title="Datadog"
      icon="integrations/datadog"
      blurb={t(
        'Pulls the Datadog logs that carry the session’s openReplaySession.id attribute onto its timeline.',
      )}
      docs="https://docs.openreplay.com/integrations/datadog"
      initialValues={{ site: '', api_key: '', app_key: '' }}
      existsKey="api_key"
      fields={[
        { key: 'site', label: t('Site'), placeholder: 'datadoghq.com' },
        { key: 'api_key', label: t('API key'), secret: true },
        { key: 'app_key', label: t('Application key'), secret: true },
      ]}
      onClose={onClose}
    />
  );
}

export default DatadogFormModal;
