import React from 'react';
import { useTranslation } from 'react-i18next';

import BackendIntegrationDrawer from '../../BackendIntegrationDrawer';

function SentryForm({
  onClose,
}: {
  onClose?: () => void;
  integrated?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <BackendIntegrationDrawer
      name="sentry"
      title="Sentry"
      icon="integrations/sentry"
      blurb={t(
        'Shows the Sentry errors your backend raised during a session, matched by the openReplaySession.id tag.',
      )}
      docs="https://docs.openreplay.com/integrations/sentry"
      initialValues={{
        url: 'https://sentry.io',
        organization_slug: '',
        project_slug: '',
        token: '',
      }}
      existsKey="token"
      fields={[
        { key: 'url', label: t('URL'), optional: true },
        { key: 'organization_slug', label: t('Organization slug') },
        { key: 'project_slug', label: t('Project slug') },
        { key: 'token', label: t('Token'), secret: true },
      ]}
      onClose={onClose}
    />
  );
}

export default SentryForm;
