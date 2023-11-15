import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

const SentryForm = (props) => (
  <div className='bg-white h-screen overflow-y-auto' style={{ width: '350px' }}>
    <IntegrationModalCard title='Sentry' icon='integrations/sentry'
                          description='Integrate Sentry with session replays to seamlessly observe backend errors.' />
    <div className='p-5 border-b mb-4'>
      <div className='font-medium mb-1'>How it works?</div>
      <ol className="list-decimal list-inside">
        <li>Generate Sentry Auth Token</li>
        <li>Enter the token below</li>
        <li>Propagate openReplaySessionToken</li>
      </ol>
      <DocLink className='mt-4' label='See detailed steps' url='https://docs.openreplay.com/integrations/sentry' />
    </div>
    <IntegrationForm
      {...props}
      name='sentry'
      formFields={[
        {
          key: 'organizationSlug',
          label: 'Organization Slug'
        },
        {
          key: 'projectSlug',
          label: 'Project Slug'
        },
        {
          key: 'token',
          label: 'Token'
        }
      ]}
    />
  </div>
);

SentryForm.displayName = 'SentryForm';

export default SentryForm;
