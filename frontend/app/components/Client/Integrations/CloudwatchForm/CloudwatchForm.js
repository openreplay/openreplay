import { ACCESS_KEY_ID_LENGTH, SECRET_ACCESS_KEY_LENGTH } from 'Types/integrations/cloudwatchConfig';
import IntegrationForm from '../IntegrationForm'; 
import LogGroupDropdown from './LogGroupDropdown';
import RegionDropdown from './RegionDropdown';

const CloudwatchForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate CloudWatch with OpenReplay and see backend errors alongside session replays.</div>
      <div className="mt-8">See <a href="https://docs.openreplay.com/javascript-sdk" className="color-teal underline" target="_blank">Documentation</a> for more details.</div>
    </div>
    <IntegrationForm 
      { ...props }
      name="cloudwatch"
      formFields={[ {
          key: "awsAccessKeyId",
          label: "AWS Access Key ID",
        }, {
          key: "awsSecretAccessKey",
          label: "AWS Secret Access Key",
        }, {
          key: "region",
          label: "Region",
          component: RegionDropdown,
        }, {
          key: "logGroupName",
          label: "Log Group Name",
          component: LogGroupDropdown,
          checkIfDisplayed: config => 
            config.awsSecretAccessKey.length === SECRET_ACCESS_KEY_LENGTH &&
            config.region !== '' &&
            config.awsAccessKeyId.length === ACCESS_KEY_ID_LENGTH
        }
      ]}
    /> 
  </>
);

CloudwatchForm.displayName = "CloudwatchForm";

export default CloudwatchForm;