import React from 'react';
import { useTranslation } from 'react-i18next';

import BackendIntegrationDrawer from '../../BackendIntegrationDrawer';

function DynatraceFormModal({
  onClose,
}: {
  onClose?: () => void;
  integrated?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <BackendIntegrationDrawer
      name="dynatrace"
      title="Dynatrace"
      icon="integrations/dynatrace"
      useIcon
      blurb={t(
        'Pulls the Dynatrace log records that carry the openReplaySession.id attribute, through an OAuth client you create in Dynatrace.',
      )}
      docs="https://docs.openreplay.com/integrations/dynatrace"
      initialValues={{
        environment: '',
        client_id: '',
        client_secret: '',
        resource: '',
      }}
      existsKey="client_id"
      fields={[
        { key: 'environment', label: t('Environment ID') },
        { key: 'client_id', label: t('Client ID') },
        { key: 'client_secret', label: t('Client secret'), secret: true },
        { key: 'resource', label: t('Account URN') },
      ]}
      onClose={onClose}
    />
  );
}

export default DynatraceFormModal;
