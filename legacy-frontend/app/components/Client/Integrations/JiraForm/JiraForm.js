import React from 'react';
import IntegrationForm from '../IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';
import { useModal } from 'App/components/Modal';
import { Icon } from 'UI';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

const JiraForm = (props) => {
  const { hideModal } = useModal();
  return (
    <div className='bg-white h-screen overflow-y-auto' style={{ width: '350px' }}>
      <IntegrationModalCard title='Jira' icon='integrations/jira'
                            description='Integrate Jira with OpenReplay to enable the creation of a new ticket directly from a session.' />


      <div className='border-b my-4 p-5'>
        <div className='font-medium mb-1'>How it works?</div>
        <ol className='list-decimal list-inside'>
          <li>Create a new API token</li>
          <li>Enter the token below</li>
        </ol>
        <div className='mt-8'>
          <DocLink className='mt-4' label='Integrate Jira Cloud'
                   url='https://docs.openreplay.com/integrations/jira' />
        </div>
      </div>


      <IntegrationForm
        {...props}
        ignoreProject={true}
        name='jira'
        customPath='jira'
        onClose={hideModal}
        formFields={[
          {
            key: 'username',
            label: 'Username',
            autoFocus: true
          },
          {
            key: 'token',
            label: 'API Token'
          },
          {
            key: 'url',
            label: 'JIRA URL',
            placeholder: 'E.x. https://myjira.atlassian.net'
          }
        ]}
      />
    </div>
  );
};

JiraForm.displayName = 'JiraForm';

export default JiraForm;
