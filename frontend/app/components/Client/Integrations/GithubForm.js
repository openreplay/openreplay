import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';

const GithubForm = (props) => (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
        <h3 className="p-5 text-2xl">Github</h3>
        <div className="p-5 border-b mb-4">
            <div>Integrate GitHub with OpenReplay and create issues directly from the recording page.</div>
            <div className="mt-8">
                <DocLink className="mt-4" label="Integrate Github" url="https://docs.openreplay.com/integrations/github" />
            </div>
        </div>
        <IntegrationForm
            {...props}
            ignoreProject
            name="github"
            customPath="github"
            formFields={[
                {
                    key: 'token',
                    label: 'Token',
                },
            ]}
        />
    </div>
);

GithubForm.displayName = 'GithubForm';

export default GithubForm;
