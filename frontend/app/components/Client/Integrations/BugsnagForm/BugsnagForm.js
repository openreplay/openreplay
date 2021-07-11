import { tokenRE } from 'Types/integrations/bugsnagConfig';
import IntegrationForm from '../IntegrationForm'; 
import ProjectListDropdown from './ProjectListDropdown';
import DocLink from 'Shared/DocLink/DocLink';

const BugsnagForm = (props) => (
  <>
    
    <IntegrationForm 
      { ...props }
      name="bugsnag"
      formFields={[ {
          key: "authorizationToken",
          label: "Authorisation Token",
        }, {
          key: "bugsnagProjectId",
          label: "Project",
          checkIfDisplayed: config => tokenRE.test(config.authorizationToken),
          component: ProjectListDropdown,
        }
      ]}
    /> 
  </>
);

BugsnagForm.displayName = "BugsnagForm";

export default BugsnagForm;