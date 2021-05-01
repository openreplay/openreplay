import IntegrationForm from './IntegrationForm'; 

const StackdriverForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate Stackdriver with OpenReplay and see backend errors alongside session recordings.</div>
      <div className="mt-8">See <a href="https://docs.openreplay.com/javascript-sdk" className="color-teal underline" target="_blank">Documentation</a> for more details.</div>
    </div>
    <IntegrationForm 
      { ...props }
      name="stackdriver"
      formFields={[ {
          key: "logName",
          label: "Log Name",
        }, {
          key: "serviceAccountCredentials",
          label: "Service Account Credentials (JSON)",
          component: 'textarea',
        }
      ]}
    /> 
  </>
);

StackdriverForm.displayName = "StackdriverForm";

export default StackdriverForm;
