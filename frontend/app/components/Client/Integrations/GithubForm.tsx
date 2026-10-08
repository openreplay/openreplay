import React from 'react';
import { useTranslation } from 'react-i18next';

import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

import DocLink from 'Shared/DocLink/DocLink';

import IntegrationForm from './IntegrationForm';

function GithubForm(props) {
  const { t } = useTranslation();
  return (
    <div className="bg-surface-default">
      <IntegrationModalCard
        title="Github"
        icon="integrations/github"
        description={t(
          'Integrate GitHub with OpenReplay to enable the direct creation of a new issue from a session.',
        )}
      />
      <div className="p-5 border-b mb-4">
        <div>
          {t(
            'Integrate GitHub with OpenReplay and create issues directly from the recording page.',
          )}
        </div>
        <div className="mt-8">
          <DocLink
            className="mt-4"
            label={t('Integrate Github')}
            url="https://docs.openreplay.com/integrations/github"
          />
        </div>
      </div>
      <IntegrationForm
        {...props}
        ignoreProject
        name="github"
        customPath="github"
        formFields={[
          {
            key: 'token',
            label: 'Token',
          },
        ]}
      />
    </div>
  );
}

GithubForm.displayName = 'GithubForm';

export default GithubForm;
