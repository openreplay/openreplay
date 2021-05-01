import IntegrationForm from '../IntegrationForm'; 

const JiraForm = (props) => (
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
);

JiraForm.displayName = "JiraForm";

export default JiraForm;