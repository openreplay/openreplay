import React from 'react';
import { useTranslation } from 'react-i18next';

import IssueTrackerDrawer from './IssueTrackerDrawer';

function GithubForm(props: { integrated?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  return (
    <IssueTrackerDrawer
      {...props}
      name="github"
      title="GitHub"
      icon="integrations/github"
      blurb={t(
        'Open a GitHub issue from a session in any repository the token can reach, with the replay linked in it.',
      )}
      docs="https://docs.openreplay.com/integrations/github"
      fields={[
        { key: 'token', label: t('Personal access token'), secret: true },
      ]}
    />
  );
}

GithubForm.displayName = 'GithubForm';

export default GithubForm;
