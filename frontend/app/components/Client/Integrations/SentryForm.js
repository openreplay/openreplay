import IntegrationForm from './IntegrationForm'; 

const SentryForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate Sentry with OpenReplay and see backend errors alongside session recordings.</div>
      <div className="mt-8">See <a href="https://docs.openreplay.com/javascript-sdk" className="color-teal underline" target="_blank">Documentation</a> for more details.</div>
    </div>
    <IntegrationForm 
      { ...props }
      name="sentry"
      formFields={[ {
          key: "organizationSlug",
          label: "Organization Slug",
        }, {
          key: "projectSlug",
          label: "Project Slug",
        }, {
          key: "token",
          label: "Token",
        }
      ]}
    />
  </>
);

SentryForm.displayName = "SentryForm";

export default SentryForm;