import React, { useState } from 'react';
import { Tabs, CopyButton } from 'UI';
import DocCard from 'Shared/DocCard/DocCard';
import { useModal } from 'App/components/Modal';
import UserForm from 'App/components/Client/Users/components/UserForm/UserForm';
import AndroidInstallDocs from 'Components/Onboarding/components/OnboardingTabs/InstallDocs/AndroidInstallDocs';
import { CollabCard, ProjectKeyCard } from "./Callouts";
import MobileInstallDocs from './InstallDocs/MobileInstallDocs';
import { useTranslation } from 'react-i18next';

const iOS = 'iOS';
const ANDROID = 'Android';
const TABS = [
  { key: iOS, text: iOS },
  { key: ANDROID, text: ANDROID },
];

interface Props {
  site: Record<string, any>;
}

function MobileTrackingCodeModal(props: Props) {
  const { t } = useTranslation();
  const { site } = props;
  const [activeTab, setActiveTab] = useState(iOS);
  const { showModal } = useModal();
  const ingestPoint = `https://${window.location.hostname}/ingest`;

  const showUserModal = () => {
    showModal(<UserForm />, { right: true });
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case iOS:
        return (
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <MobileInstallDocs site={site} ingestPoint={ingestPoint} />
            </div>

            <div className="col-span-2">
              <CollabCard showUserModal={showUserModal} />

              <ProjectKeyCard projectKey={site.projectKey} />
            </div>
          </div>
        );
      case ANDROID:
        return (
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <AndroidInstallDocs site={site} ingestPoint={ingestPoint} />
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

export default MobileTrackingCodeModal;
