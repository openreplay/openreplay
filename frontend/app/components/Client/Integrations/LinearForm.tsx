import React from 'react';
import { useTranslation } from 'react-i18next';

import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

import DocLink from 'Shared/DocLink/DocLink';

import IntegrationForm from './IntegrationForm';

function LinearForm(props) {
  const { t } = useTranslation();
  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '350px' }}
    >
      <IntegrationModalCard
        title="Linear"
        icon="integrations/linear"
        description={t(
          'Integrate Linear with OpenReplay to enable the direct creation of a new issue from a session.',
        )}
      />
      <div className="p-5 border-b mb-4">
        <div>
          {t(
            'Integrate Linear with OpenReplay and create issues directly from the recording page.',
          )}
        </div>
        <div className="mt-8">
          <DocLink
            className="mt-4"
            label={t('Integrate Linear')}
            url="https://docs.openreplay.com/integrations/linear"
          />
        </div>
      </div>
      <IntegrationForm
        {...props}
        ignoreProject
        name="linear"
        customPath="linear"
        formFields={[
          {
            key: 'token',
            label: 'API Key',
          },
        ]}
      />
    </div>
  );
}

LinearForm.displayName = 'LinearForm';

export default LinearForm;
