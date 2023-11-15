import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

const GithubForm = (props) => (
  <div className='bg-white h-screen overflow-y-auto' style={{ width: '350px' }}>
    <IntegrationModalCard title='Github' icon='integrations/github'
                          description='Integrate GitHub with OpenReplay to enable the direct creation of a new issue from a session.' />
    <div className='p-5 border-b mb-4'>
      <div>Integrate GitHub with OpenReplay and create issues directly from the recording page.</div>
      <div className='mt-8'>
        <DocLink className='mt-4' label='Integrate Github' url='https://docs.openreplay.com/integrations/github' />
      </div>
    </div>
    <IntegrationForm
      {...props}
      ignoreProject
      name='github'
      customPath='github'
      formFields={[
        {
          key: 'token',
          label: 'Token'
        }
      ]}
    />
  </div>
);

GithubForm.displayName = 'GithubForm';

export default GithubForm;
