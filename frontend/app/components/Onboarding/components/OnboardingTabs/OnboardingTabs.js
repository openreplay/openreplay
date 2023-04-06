import React, { useState } from 'react';
import { Tabs, Button, Icon, CopyButton } from 'UI';
import ProjectCodeSnippet from './ProjectCodeSnippet';
import InstallDocs from './InstallDocs';
import DocCard from 'Shared/DocCard/DocCard';

const PROJECT = 'SCRIPT';
const DOCUMENTATION = 'NPM';
const TABS = [
  { key: DOCUMENTATION, text: DOCUMENTATION },
  { key: PROJECT, text: PROJECT },
];

const TrackingCodeModal = () => {
  const [copied, setCopied] = useState(false);
  const [changed, setChanged] = useState(false);
  const [activeTab, setActiveTab] = useState(DOCUMENTATION);

  const showUserModal = () => {};

  const renderActiveTab = () => {
    switch (activeTab) {
      case PROJECT:
        return (
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <ProjectCodeSnippet />
            </div>

            <div className="col-span-2">
              <DocCard title="Need help from team member?">
                <a className="link" onClick={showUserModal}>
                  Invite and Collaborate
                </a>
              </DocCard>
              <DocCard title="Project Key">
                <div className="rounded bg-white px-2 py-1 flex items-center justify-between">
                  <span>PROJECT_KEY</span>
                  <CopyButton content={''} className="capitalize" />
                </div>
              </DocCard>
              <DocCard title="Other ways to install">
                <a
                  className="link flex items-center"
                  href="https://docs.openreplay.com/integrations/google-tag-manager"
                  target="_blank"
                >
                  Google Tag Manager (GTM)
                  <Icon name="external-link-alt" className="ml-1" color="blue" />
                </a>
              </DocCard>
            </div>
          </div>
        );
      case DOCUMENTATION:
        return (
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <InstallDocs />
            </div>

            <div className="col-span-2">
              <DocCard title="Need help from team member?">Invite and Collaborate</DocCard>
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
};

export default TrackingCodeModal;
