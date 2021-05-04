import IntegrationForm from './IntegrationForm'; 
import DocLink from 'Shared/DocLink/DocLink';

const GithubForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>Integrate GitHub with OpenReplay and create issues directly from the recording page.</div>
      <div className="mt-8">
        <DocLink className="mt-4" label="Integrate Github" url="https://docs.openreplay.com/integrations/github" />
      </div>
    </div>
    <IntegrationForm 
      { ...props }
      ignoreProject
      name="issues"
      customPath="github"
      formFields={[
        {
          key: "token",
          label: "Token",
        }
      ]}
    />
  </> 
);

GithubForm.displayName = "GithubForm";

export default GithubForm;