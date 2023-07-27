import React from 'react';
import IntegrationForm from '../IntegrationForm';
import RegionDropdown from './RegionDropdown';
import DocLink from 'Shared/DocLink/DocLink';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

const SumoLogicForm = (props) => (
  <div className='bg-white h-screen overflow-y-auto' style={{ width: '350px' }}>
    <IntegrationModalCard title='Sumologic' icon='integrations/sumologic'
                          description='Integrate Sumo Logic with session replays to seamlessly observe backend errors.' />
    <div className='p-5 border-b mb-4'>
      <div className='font-medium mb-1'>How it works?</div>
      <ol className="list-decimal list-inside">
        <li>Create a new Access ID and Access Key</li>
        <li>Enter the details below</li>
        <li>Propagate openReplaySessionToken</li>
      </ol>
      <DocLink className='mt-4' label='Integrate SumoLogic' url='https://docs.openreplay.com/integrations/sumo' />
    </div>
    <IntegrationForm
      {...props}
      name='sumologic'
      formFields={[
        {
          key: 'accessId',
          label: 'Access ID'
        },
        {
          key: 'accessKey',
          label: 'Access Key'
        },
        {
          key: 'region',
          label: 'Region',
          component: RegionDropdown
        }
      ]}
    />
  </div>
);

SumoLogicForm.displayName = 'SumoLogicForm';

export default SumoLogicForm;
