import IntegrationForm from '../IntegrationForm'; 

const NewrelicForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate NewRelic with OpenReplay and see backend errors alongside session recordings.</div>
      <div className="mt-8">See <a href="https://docs.openreplay.com/javascript-sdk" className="color-teal underline" target="_blank">Documentation</a> for more details.</div>
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