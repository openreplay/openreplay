import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

const StackdriverForm = (props) => (
  <div className='bg-white h-screen overflow-y-auto' style={{ width: '350px' }}>
    <IntegrationModalCard title='Google Cloud' icon='integrations/google-cloud'
                          description='Integrate Google Cloud Watch to see backend logs and errors alongside session replay.' />
    <div className='p-5 border-b mb-4'>
      <div className='font-medium mb-1'>How it works?</div>
      <ol className="list-decimal list-inside">
        <li>Create Google Cloud Service Account</li>
        <li>Enter the details below</li>
        <li>Propagate openReplaySessionToken</li>
      </ol>
      <DocLink className='mt-4' label='Integrate Stackdriver'
               url='https://docs.openreplay.com/integrations/stackdriver' />
    </div>
    <IntegrationForm
      {...props}
      name='stackdriver'
      formFields={[
        {
          key: 'logName',
          label: 'Log Name'
        },
        {
          key: 'serviceAccountCredentials',
          label: 'Service Account Credentials (JSON)',
          component: 'textarea'
        }
      ]}
    />
  </div>
);

StackdriverForm.displayName = 'StackdriverForm';

export default StackdriverForm;
