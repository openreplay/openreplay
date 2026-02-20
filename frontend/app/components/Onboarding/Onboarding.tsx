import { AppWindow, Smartphone } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PANEL_SIZES } from 'App/constants/panelSizes';
import { OB_DEFAULT_TAB, OB_TABS, onboarding as onboardingRoute, withSiteId } from 'App/routes';
import { useNavigate, useParams } from 'App/routing';

import IdentifyUsersTab from './components/IdentifyUsersTab';
import InstallOpenReplayTab from './components/InstallOpenReplayTab';
import IntegrationsTab from './components/IntegrationsTab';
import ManageUsersTab from './components/ManageUsersTab';
import SideMenu from './components/SideMenu';

const platformMap = {
  ios: 'mobile',
  web: 'web',
};

function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeTab = '', siteId = '' } = useParams<{
    activeTab?: string;
    siteId?: string;
  }>();
  const platforms = [
    {
      label: (
        <div className="font-semibold flex gap-2 items-center">
          <AppWindow size={16} />
          &nbsp;{t('Web')}
        </div>
      ),
      value: 'web',
    } as const,
    {
      label: (
        <div className="font-semibold flex gap-2 items-center">
          <Smartphone size={16} />
          &nbsp;{t('Mobile')}
        </div>
      ),
      value: 'mobile',
    } as const,
  ] as const;
  const [platform, setPlatform] = React.useState(platforms[0]);

  const onMenuItemClick = (tab: string) => {
    navigate(withSiteId(onboardingRoute(tab), siteId));
  };

  const resolvedTab = activeTab || OB_DEFAULT_TAB;

  React.useEffect(() => {
    if (!activeTab) {
      navigate(withSiteId(onboardingRoute(OB_DEFAULT_TAB), siteId), { replace: true });
    }
  }, [activeTab, siteId, navigate]);

  const renderTab = () => {
    switch (resolvedTab) {
      case OB_TABS.IDENTIFY_USERS:
        return (
          <IdentifyUsersTab
            platforms={platforms}
            platform={platform}
            setPlatform={setPlatform}
            platformMap={platformMap}
          />
        );
      case OB_TABS.MANAGE_USERS:
        return <ManageUsersTab />;
      case OB_TABS.INTEGRATIONS:
        return <IntegrationsTab />;
      case OB_TABS.INSTALLING:
      default:
        return (
          <InstallOpenReplayTab
            platforms={platforms}
            platform={platform}
            setPlatform={setPlatform}
            platformMap={platformMap}
          />
        );
    }
  };

  return (
    <div className="flex relative">
      <SideMenu activeTab={resolvedTab} onClick={onMenuItemClick} />
      <div className="w-full">
        <div
          className="bg-white w-full rounded-lg mx-auto mb-8 border"
          style={{ maxWidth: PANEL_SIZES.maxWidth }}
        >
          {renderTab()}
        </div>
      </div>
      {/* <div className="py-6 px-4 w-full flex items-center fixed bottom-0 bg-white border-t z-10">
        <div className="ml-auto">
          <OnboardingNavButton />
        </div>
      </div> */}
    </div>
  );
}

export default Onboarding;
