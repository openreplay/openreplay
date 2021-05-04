import IntegrationForm from './IntegrationForm'; 
import DocLink from 'Shared/DocLink/DocLink';

const SentryForm = (props) => (
  <>
    <div className="p-5 border-b mb-4">
      <div>How to integrate Sentry with OpenReplay and see backend errors alongside session recordings.</div>
      <DocLink className="mt-4" label="Integrate Sentry" url="https://docs.openreplay.com/integrations/sentry" />
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