import IntegrationForm from './IntegrationForm'; 
import DocLink from 'Shared/DocLink/DocLink';

const RollbarForm = (props) => (
  <>
    
    <IntegrationForm 
      { ...props }
      name="rollbar"
      formFields={[ {
          key: "accessToken",
          label: "Access Token",
        }
      ]}
    /> 
  </>
);

RollbarForm.displayName = "RollbarForm";

export default RollbarForm;