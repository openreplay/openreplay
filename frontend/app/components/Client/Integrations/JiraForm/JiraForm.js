import React from 'react';
import IntegrationForm from '../IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';

const JiraForm = (props) => (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
        <h3 className="p-5 text-2xl">Jira</h3>
        <div className="p-5 border-b mb-4">
            <div>How to integrate Jira Cloud with OpenReplay.</div>
            <div className="mt-8">
                <DocLink className="mt-4" label="Integrate Jira Cloud" url="https://docs.openreplay.com/integrations/jira" />
            </div>
        </div>
        <IntegrationForm
            {...props}
            ignoreProject={true}
            name="jira"
            customPath="jira"
            formFields={[
                {
                    key: 'username',
                    label: 'Username',
                    autoFocus: true,
                },
                {
                    key: 'token',
                    label: 'API Token',
                },
                {
                    key: 'url',
                    label: 'JIRA URL',
                    placeholder: 'E.x. https://myjira.atlassian.net',
                },
            ]}
        />
    </div>
);

JiraForm.displayName = 'JiraForm';

export default JiraForm;
