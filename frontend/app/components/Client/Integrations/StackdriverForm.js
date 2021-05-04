import IntegrationForm from './IntegrationForm'; 
import DocLink from 'Shared/DocLink/DocLink';

const StackdriverForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate Stackdriver with OpenReplay and see backend errors alongside session recordings.</div>
      <DocLink className="mt-4" label="Integrate Stackdriver" url="https://docs.openreplay.com/integrations/stackdriver" />
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
