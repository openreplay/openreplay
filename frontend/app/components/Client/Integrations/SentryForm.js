import React from 'react';
import IntegrationForm from './IntegrationForm';
import DocLink from 'Shared/DocLink/DocLink';

const SentryForm = (props) => (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
        <h3 className="p-5 text-2xl">Sentry</h3>
        <div className="p-5 border-b mb-4">
            <div>How to integrate Sentry with OpenReplay and see backend errors alongside session recordings.</div>
            <DocLink className="mt-4" label="Integrate Sentry" url="https://docs.openreplay.com/integrations/sentry" />
        </div>
        <IntegrationForm
            {...props}
            name="sentry"
            formFields={[
                {
                    key: 'organizationSlug',
                    label: 'Organization Slug',
                },
                {
                    key: 'projectSlug',
                    label: 'Project Slug',
                },
                {
                    key: 'token',
                    label: 'Token',
                },
            ]}
        />
    </div>
);

SentryForm.displayName = 'SentryForm';

export default SentryForm;
