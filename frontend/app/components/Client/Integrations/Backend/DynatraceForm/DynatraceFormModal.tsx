import React from 'react';

import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

import DocLink from 'Shared/DocLink/DocLink';

import IntegrationForm from '../../IntegrationForm';

const DynatraceFormModal = (props) => (
  <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
    <IntegrationModalCard
      title="Dynatrace"
      icon="integrations/dynatrace"
      description="Integrate Dynatrace with session replays to link backend logs with user sessions for faster issue resolution."
    />
    <div className="p-5 border-b mb-4">
      <div className="font-medium mb-1">How it works?</div>
      <ol className="list-decimal list-inside">
        <li>Enter your Environment ID, Client ID, Client Secret, and Account URN in the form below.</li>
        <li>Create a custom Log attribute openReplaySessionToken in Dynatrace.</li>
        <li>Propagate openReplaySessionToken in your application's backend logs.</li>
      </ol>
      <DocLink
        className="mt-4"
        label="See detailed steps"
        url="https://docs.openreplay.com/integrations/dynatrace"
      />
    </div>
    <IntegrationForm
      {...props}
      name="datadog"
      formFields={[
        {
          key: 'envID',
          label: 'Environment ID',
          autoFocus: true,
        },
        {
          key: 'clientID',
          label: 'Client ID',
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
        },
        {
          key: 'urn',
          label: 'Dynatrace Account URN',
        },
      ]}
    />
  </div>
);

DynatraceFormModal.displayName = 'DynatraceFormModal';

export default DynatraceFormModal;
