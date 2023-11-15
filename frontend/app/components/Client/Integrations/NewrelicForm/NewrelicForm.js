import React from 'react';
import IntegrationForm from '../IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

const NewrelicForm = (props) => (
  <div className='bg-white h-screen overflow-y-auto' style={{ width: '350px' }}>
    <IntegrationModalCard title='New Relic' icon='integrations/newrelic'
                          description='Integrate NewRelic with session replays to seamlessly observe backend errors.' />
    <div className='p-5 border-b mb-4'>
      <div className='font-medium mb-1'>How it works?</div>
      <ol className="list-decimal list-inside">
        <li>Create Query Key</li>
        <li>Enter the details below</li>
        <li>Propagate openReplaySessionToken</li>
      </ol>
      <DocLink className='mt-4' label='Integrate NewRelic' url='https://docs.openreplay.com/integrations/newrelic' />
    </div>
    <IntegrationForm
      {...props}
      name='newrelic'
      formFields={[
        {
          key: 'applicationId',
          label: 'Application Id'
        },
        {
          key: 'xQueryKey',
          label: 'X-Query-Key'
        },
        {
          key: 'region',
          label: 'EU Region',
          type: 'checkbox'
        }
      ]}
    />
  </div>
);

NewrelicForm.displayName = 'NewrelicForm';

export default NewrelicForm;
