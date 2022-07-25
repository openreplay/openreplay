import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';

const RollbarForm = (props) => (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
        <h3 className="p-5 text-2xl">Rollbar</h3>
        <div className="p-5 border-b mb-4">
            <div>How to integrate Rollbar with OpenReplay and see backend errors alongside session replays.</div>
            <DocLink className="mt-4" label="Integrate Rollbar" url="https://docs.openreplay.com/integrations/rollbar" />
        </div>
        <IntegrationForm
            {...props}
            name="rollbar"
            formFields={[
                {
                    key: 'accessToken',
                    label: 'Access Token',
                },
            ]}
        />
    </div>
);

RollbarForm.displayName = 'RollbarForm';

export default RollbarForm;
