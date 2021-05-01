import IntegrationForm from '../IntegrationForm';
import RegionDropdown from './RegionDropdown';

const SumoLogicForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate SumoLogic with OpenReplay and see backend errors alongside session recordings.</div>
      <div className="mt-8">See <a href="https://docs.openreplay.com/javascript-sdk" className="color-teal underline" target="_blank">Documentation</a> for more details.</div>
    </div>
    <IntegrationForm 
      { ...props }
      name="sumologic"
      formFields={[ {
          key: "accessId",
          label: "Access ID",
        }, {
          key: "accessKey",
          label: "Access Key",
        }, {
          key: "region",
          label: "Region",
          component: RegionDropdown,
        }
      ]}
    /> 
  </>
);

SumoLogicForm.displayName = "SumoLogicForm";

export default SumoLogicForm;
