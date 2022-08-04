import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';

const StackdriverForm = (props) => (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
        <h3 className="p-5 text-2xl">Stackdriver</h3>
        <div className="p-5 border-b mb-4">
            <div>How to integrate Stackdriver with OpenReplay and see backend errors alongside session recordings.</div>
            <DocLink className="mt-4" label="Integrate Stackdriver" url="https://docs.openreplay.com/integrations/stackdriver" />
        </div>
        <IntegrationForm
            {...props}
            name="stackdriver"
            formFields={[
                {
                    key: 'logName',
                    label: 'Log Name',
                },
                {
                    key: 'serviceAccountCredentials',
                    label: 'Service Account Credentials (JSON)',
                    component: 'textarea',
                },
            ]}
        />
    </div>
);

StackdriverForm.displayName = 'StackdriverForm';

export default StackdriverForm;
