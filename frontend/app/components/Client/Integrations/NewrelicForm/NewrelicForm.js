import React from 'react';
import IntegrationForm from '../IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';

const NewrelicForm = (props) => (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
        <h3 className="p-5 text-2xl">New Relic</h3>
        <div className="p-5 border-b mb-4">
            <div>How to integrate NewRelic with OpenReplay and see backend errors alongside session recordings.</div>
            <DocLink className="mt-4" label="Integrate NewRelic" url="https://docs.openreplay.com/integrations/newrelic" />
        </div>
        <IntegrationForm
            {...props}
            name="newrelic"
            formFields={[
                {
                    key: 'applicationId',
                    label: 'Application Id',
                },
                {
                    key: 'xQueryKey',
                    label: 'X-Query-Key',
                },
                {
                    key: 'region',
                    label: 'EU Region',
                    type: 'checkbox',
                },
            ]}
        />
    </div>
);

NewrelicForm.displayName = 'NewrelicForm';

export default NewrelicForm;
