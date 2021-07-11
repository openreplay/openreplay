import IntegrationForm from './IntegrationForm'; 
import DocLink from 'Shared/DocLink/DocLink';

const DatadogForm = (props) => (
  <>
    
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
