import IntegrationForm from '../IntegrationForm'; 
import DocLink from 'Shared/DocLink/DocLink';

const NewrelicForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate NewRelic with OpenReplay and see backend errors alongside session recordings.</div>
      <DocLink className="mt-4" label="Integrate NewRelic" url="https://docs.openreplay.com/integrations/newrelic" />
    </div>
    <IntegrationForm 
      { ...props }
      name="newrelic"
      formFields={[ {
          key: "applicationId",
          label: "Application Id",
        }, {
          key: "xQueryKey",
          label: "X-Query-Key",
        }, {
          key: 'region',
          label: 'EU Region',
          type: 'checkbox'
        }
      ]}
    /> 
  </>
);

NewrelicForm.displayName = "NewrelicForm";

export default NewrelicForm;