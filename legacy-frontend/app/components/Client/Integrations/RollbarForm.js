import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

const RollbarForm = (props) => (
  <div className='bg-white h-screen overflow-y-auto' style={{ width: '350px' }}>
    <IntegrationModalCard title='Rollbar' icon='integrations/rollbar'
                          description='Integrate Rollbar with session replays to seamlessly observe backend errors.' />
    <div className='p-5 border-b mb-4'>
      <div className='font-medium mb-1'>How it works?</div>
      <ol className="list-decimal list-inside">
        <li>Create Rollbar Access Tokens</li>
        <li>Enter the token below</li>
        <li>Propagate openReplaySessionToken</li>
      </ol>
      <DocLink className='mt-4' label='Integrate Rollbar' url='https://docs.openreplay.com/integrations/rollbar' />
    </div>
    <IntegrationForm
      {...props}
      name='rollbar'
      formFields={[
        {
          key: 'accessToken',
          label: 'Access Token'
        }
      ]}
    />
  </div>
);

RollbarForm.displayName = 'RollbarForm';

export default RollbarForm;
