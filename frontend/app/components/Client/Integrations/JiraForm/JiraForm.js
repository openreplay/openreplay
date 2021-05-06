import IntegrationForm from '../IntegrationForm'; 
import DocLink from 'Shared/DocLink/DocLink';

const JiraForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate Jira Cloud with OpenReplay.</div>
      <div className="mt-8">
        <DocLink className="mt-4" label="Integrate Jira Cloud" url="https://docs.openreplay.com/integrations/jira" />
      </div>
    </div>
    <IntegrationForm 
      { ...props }
      ignoreProject={true}
      name="issues"
      customPath="jira"
      formFields={[ {
          key: "username",
          label: "Username",
          autoFocus: true
        }, {
          key: "token",
          label: "API Token",
        }, {
          key: "url",
          label: "JIRA URL",
          placeholder: 'E.x. https://myjira.atlassian.net'
        },        
      ]}
    /> 
  </>
);

JiraForm.displayName = "JiraForm";

export default JiraForm;