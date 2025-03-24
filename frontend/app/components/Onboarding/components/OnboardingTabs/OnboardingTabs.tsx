import React, { useState } from 'react';
import { Tabs, Icon, CopyButton } from 'UI';
import DocCard from 'Shared/DocCard/DocCard';
import { useModal } from 'App/components/Modal';
import UserForm from 'App/components/Client/Users/components/UserForm/UserForm';
import { CollabCard, ProjectKeyCard } from "./Callouts";
import InstallDocs from './InstallDocs';
import ProjectCodeSnippet from './ProjectCodeSnippet';
import { useTranslation } from 'react-i18next';

const PROJECT = 'SCRIPT';
const DOCUMENTATION = 'NPM';
const TABS = [
  { key: DOCUMENTATION, text: DOCUMENTATION },
  { key: PROJECT, text: PROJECT },
];

interface Props {
  site: any;
}
function TrackingCodeModal(props: Props) {
  const { t } = useTranslation();
  const { site } = props;
  const [activeTab, setActiveTab] = useState(DOCUMENTATION);
  const { showModal } = useModal();

  const showUserModal = () => {
    showModal(<UserForm />, { right: true });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case PROJECT:
        return (
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <ProjectCodeSnippet site={site} />
            </div>

            <div className="col-span-2">
              <CollabCard showUserModal={showUserModal} />

              <ProjectKeyCard projectKey={site.projectKey} />
              <DocCard title="Other ways to install">
                <a
                  className="link flex items-center"
                  href="https://docs.openreplay.com/integrations/google-tag-manager"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('Google Tag Manager (GTM)')}
                  <Icon
                    name="external-link-alt"
                    className="ml-1"
                    color="blue"
                  />
                </a>
              </DocCard>
            </div>
          </div>
        );
      case DOCUMENTATION:
        return (
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <InstallDocs site={site} />
            </div>

            <div className="col-span-2">
              <CollabCard showUserModal={showUserModal} />

              <ProjectKeyCard projectKey={site.projectKey} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Tabs tabs={TABS} active={activeTab} onClick={setActiveTab} />
      <div className="p-5 py-8">{renderActiveTab()}</div>
    </>
  );
}

export default TrackingCodeModal;
