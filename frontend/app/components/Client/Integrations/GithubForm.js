import IntegrationForm from './IntegrationForm'; 

const GithubForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>Integrate GitHub with OpenReplay and create issues directly from the recording page.</div>
      <div className="mt-8">
        <a href="https://docs.openreplay.com/javascript-sdk" className="color-teal underline" target="_blank">Integrate with Github</a>
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