import React, { useState } from 'react';
import { Tabs, CopyButton } from 'UI';
import MobileInstallDocs from './InstallDocs/MobileInstallDocs';
import DocCard from 'Shared/DocCard/DocCard';
import { useModal } from 'App/components/Modal';
import UserForm from 'App/components/Client/Users/components/UserForm/UserForm';

const iOS = 'iOS';
const TABS = [
  { key: iOS, text: iOS },
];

interface Props {
  site: Record<string, any>;
}

const MobileTrackingCodeModal = (props: Props) => {
  const { site } = props;
  const [activeTab, setActiveTab] = useState(iOS);
  const { showModal } = useModal();

  const showUserModal = () => {
    showModal(<UserForm />, { right: true });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case iOS:
        return (
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <MobileInstallDocs site={site} />
            </div>

            <div className="col-span-2">
              <DocCard title="Need help from team member?">
                <a className="link" onClick={showUserModal}>
                  Invite and Collaborate
                </a>
              </DocCard>

              <DocCard title="Project Key">
                <div className={'p-2 rounded bg-white flex justify-between items-center'}>
                  {site.projectKey}
                  <CopyButton content={site.projectKey} />
                </div>
              </DocCard>
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

export default MobileTrackingCodeModal;
