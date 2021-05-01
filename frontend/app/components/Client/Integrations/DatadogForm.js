import IntegrationForm from './IntegrationForm'; 

const DatadogForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate Datadog with OpenReplay and see backend errors alongside session recordings.</div>
      <div className="mt-8">See <a href="https://docs.openreplay.com/javascript-sdk" className="color-teal underline" target="_blank">Documentation</a> for more details.</div>
    </div>
    <IntegrationForm 
      { ...props }
      name="datadog"
      formFields={[ {
          key: "apiKey",
          label: "API Key",
          autoFocus: true,
        }, {
          key: "applicationKey",
          label: "Application Key",
        }
      ]}
    /> 
  </>
);

DatadogForm.displayName = "DatadogForm";

export default DatadogForm;
