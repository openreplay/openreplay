import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

const DatadogForm = (props) => (
  <div className='bg-white h-screen overflow-y-auto' style={{ width: '350px' }}>
    <IntegrationModalCard title='Datadog' icon='integrations/datadog'
                          description='Incorporate DataDog to visualize backend errors alongside session replay, for easy troubleshooting.' />
    <div className='p-5 border-b mb-4'>
      <div className='font-medium mb-1'>How it works?</div>
      <ol className="list-decimal list-inside">
        <li>Generate Datadog API Key & Application Key</li>
        <li>Enter the API key below</li>
        <li>Propagate openReplaySessionToken</li>
      </ol>
      <DocLink className='mt-4' label='Integrate Datadog' url='https://docs.openreplay.com/integrations/datadog' />
    </div>
    <IntegrationForm
      {...props}
      name='datadog'
      formFields={[
        {
          key: 'apiKey',
          label: 'API Key',
          autoFocus: true
        },
        {
          key: 'applicationKey',
          label: 'Application Key'
        }
      ]}
    />
  </div>
);

DatadogForm.displayName = 'DatadogForm';

export default DatadogForm;
