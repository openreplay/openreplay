import React from 'react';
import { ACCESS_KEY_ID_LENGTH, SECRET_ACCESS_KEY_LENGTH } from 'Types/integrations/cloudwatchConfig';
import IntegrationForm from '../IntegrationForm';
import LogGroupDropdown from './LogGroupDropdown';
import RegionDropdown from './RegionDropdown';
import DocLink from 'Shared/DocLink/DocLink';

const CloudwatchForm = (props) => (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
        <h3 className="p-5 text-2xl">Cloud Watch</h3>
        <div className="p-5 border-b mb-4">
            <div>How to integrate CloudWatch with OpenReplay and see backend errors alongside session replays.</div>
            <DocLink className="mt-4" label="Integrate CloudWatch" url="https://docs.openreplay.com/integrations/cloudwatch" />
        </div>
        <IntegrationForm
            {...props}
            name="cloudwatch"
            formFields={[
                {
                    key: 'awsAccessKeyId',
                    label: 'AWS Access Key ID',
                },
                {
                    key: 'awsSecretAccessKey',
                    label: 'AWS Secret Access Key',
                },
                {
                    key: 'region',
                    label: 'Region',
                    component: RegionDropdown,
                },
                {
                    key: 'logGroupName',
                    label: 'Log Group Name',
                    component: LogGroupDropdown,
                    checkIfDisplayed: (config) =>
                        config.awsSecretAccessKey.length === SECRET_ACCESS_KEY_LENGTH &&
                        config.region !== '' &&
                        config.awsAccessKeyId.length === ACCESS_KEY_ID_LENGTH,
                },
            ]}
        />
    </div>
);

CloudwatchForm.displayName = 'CloudwatchForm';

export default CloudwatchForm;
