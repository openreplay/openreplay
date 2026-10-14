import React from 'react';
import { useTranslation } from 'react-i18next';

import IssueTrackerDrawer from './IssueTrackerDrawer';

function LinearForm(props: { integrated?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  return (
    <IssueTrackerDrawer
      {...props}
      name="linear"
      title="Linear"
      icon="integrations/linear"
      blurb={t(
        'Create a Linear issue in one of your teams from a session, with the replay linked in it.',
      )}
      docs="https://docs.openreplay.com/integrations/linear"
      fields={[{ key: 'token', label: t('API key'), secret: true }]}
    />
  );
}

LinearForm.displayName = 'LinearForm';

export default LinearForm;
