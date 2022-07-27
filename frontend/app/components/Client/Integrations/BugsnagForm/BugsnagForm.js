import React from 'react';
import { tokenRE } from 'Types/integrations/bugsnagConfig';
import IntegrationForm from '../IntegrationForm';
import ProjectListDropdown from './ProjectListDropdown';
import DocLink from 'Shared/DocLink/DocLink';

const BugsnagForm = (props) => (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
        <h3 className="p-5 text-2xl">Bugsnag</h3>
        <div className="p-5 border-b mb-4">
            <div>How to integrate Bugsnag with OpenReplay and see backend errors alongside session recordings.</div>
            <DocLink className="mt-4" label="Integrate Bugsnag" url="https://docs.openreplay.com/integrations/bugsnag" />
        </div>
        <IntegrationForm
            {...props}
            name="bugsnag"
            formFields={[
                {
                    key: 'authorizationToken',
                    label: 'Authorisation Token',
                },
                {
                    key: 'bugsnagProjectId',
                    label: 'Project',
                    checkIfDisplayed: (config) => tokenRE.test(config.authorizationToken),
                    component: ProjectListDropdown,
                },
            ]}
        />
    </div>
);

BugsnagForm.displayName = 'BugsnagForm';

export default BugsnagForm;
