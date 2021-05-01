import IntegrationForm from './IntegrationForm'; 

const RollbarForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate Rollbar with OpenReplay and see backend errors alongside session replays.</div>
      <div className="mt-8">See <a href="https://docs.openreplay.com/javascript-sdk" className="color-teal underline" target="_blank">Documentation</a> for more details.</div>
    </div>
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