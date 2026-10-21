import React from 'react';
import { useTranslation } from 'react-i18next';

import IssueTrackerDrawer from '../IssueTrackerDrawer';

function JiraForm(props: { integrated?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  return (
    <IssueTrackerDrawer
      {...props}
      name="jira"
      title="Jira"
      icon="integrations/jira"
      blurb={t(
        'File a Jira ticket from any session, with the replay linked in it. Works with Jira Cloud and Server through an API token.',
      )}
      docs="https://docs.openreplay.com/integrations/jira"
      fields={[
        { key: 'username', label: t('Username'), placeholder: 'you@acme.com' },
        { key: 'token', label: t('API token'), secret: true },
        {
          key: 'url',
          label: t('Jira URL'),
          placeholder: 'https://acme.atlassian.net',
        },
      ]}
    />
  );
}

JiraForm.displayName = 'JiraForm';

export default JiraForm;
