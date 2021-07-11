import { ACCESS_KEY_ID_LENGTH, SECRET_ACCESS_KEY_LENGTH } from 'Types/integrations/cloudwatchConfig';
import IntegrationForm from '../IntegrationForm'; 
import LogGroupDropdown from './LogGroupDropdown';
import RegionDropdown from './RegionDropdown';
import DocLink from 'Shared/DocLink/DocLink';

const CloudwatchForm = (props) => (
  <>
    
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