import React from 'react';
import { tokenRE } from 'Types/integrations/bugsnagConfig';
import IntegrationForm from '../IntegrationForm';
import ProjectListDropdown from './ProjectListDropdown';
import DocLink from 'Shared/DocLink/DocLink';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

const BugsnagForm = (props) => (
  <div className='bg-white h-screen overflow-y-auto' style={{ width: '350px' }}>
    <IntegrationModalCard title='Bugsnag' icon='integrations/bugsnag'
                          description='Integrate Bugsnag to access the OpenReplay session linked to the JS exception within its interface.' />

    <div className='p-5 border-b mb-4'>
      <div className='font-medium mb-1'>How it works?</div>
      <ol className="list-decimal list-inside">
        <li>Generate Bugsnag Auth Token</li>
        <li>Enter the token below</li>
        <li>Propagate openReplaySessionToken</li>
      </ol>
      <DocLink className='mt-4' label='Integrate Bugsnag' url='https://docs.openreplay.com/integrations/bugsnag' />
    </div>
    <IntegrationForm
      {...props}
      name='bugsnag'
      formFields={[
        {
          key: 'authorizationToken',
          label: 'Authorisation Token'
        },
        {
          key: 'bugsnagProjectId',
          label: 'Project',
          checkIfDisplayed: (config) => tokenRE.test(config.authorizationToken),
          component: ProjectListDropdown
        }
      ]}
    />
  </div>
);

BugsnagForm.displayName = 'BugsnagForm';

export default BugsnagForm;
