import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';

const DatadogForm = (props) => (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
        <h3 className="p-5 text-2xl">Datadog</h3>
        <div className="p-5 border-b mb-4">
            <div>How to integrate Datadog with OpenReplay and see backend errors alongside session recordings.</div>
            <DocLink className="mt-4" label="Integrate Datadog" url="https://docs.openreplay.com/integrations/datadog" />
        </div>
        <IntegrationForm
            {...props}
            name="datadog"
            formFields={[
                {
                    key: 'apiKey',
                    label: 'API Key',
                    autoFocus: true,
                },
                {
                    key: 'applicationKey',
                    label: 'Application Key',
                },
            ]}
        />
    </div>
);

DatadogForm.displayName = 'DatadogForm';

export default DatadogForm;
