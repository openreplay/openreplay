import React from 'react';
import DocLink from 'Shared/DocLink/DocLink';
import { useModal } from 'App/components/Modal';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';
import IntegrationForm from '../IntegrationForm';
import { useTranslation } from 'react-i18next';

function JiraForm(props) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '350px' }}
    >
      <IntegrationModalCard
        title={t('Jira')}
        icon="integrations/jira"
        description={t(
          'Integrate Jira with OpenReplay to enable the creation of a new ticket directly from a session.',
        )}
      />

      <div className="border-b my-4 p-5">
        <div className="font-medium mb-1">{t('How it works?')}</div>
        <ol className="list-decimal list-inside">
          <li>{t('Create a new API token')}</li>
          <li>{t('Enter the token below')}</li>
        </ol>
        <div className="mt-8">
          <DocLink
            className="mt-4"
            label={t('Integrate Jira Cloud')}
            url="https://docs.openreplay.com/integrations/jira"
          />
        </div>
      </div>

      <IntegrationForm
        {...props}
        ignoreProject
        name="jira"
        customPath="jira"
        onClose={hideModal}
        formFields={[
          {
            key: 'username',
            label: t('Username'),
            autoFocus: true,
          },
          {
            key: 'token',
            label: t('API Token'),
          },
          {
            key: 'url',
            label: t('JIRA URL'),
            placeholder: 'E.x. https://myjira.atlassian.net',
          },
        ]}
      />
    </div>
  );
}

JiraForm.displayName = 'JiraForm';

export default JiraForm;
