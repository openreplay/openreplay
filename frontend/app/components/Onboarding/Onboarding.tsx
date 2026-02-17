import React from 'react';
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'App/routing';
import { OB_TABS, onboarding as onboardingRoute, withSiteId } from 'App/routes';
import IdentifyUsersTab from './components/IdentifyUsersTab';
import InstallOpenReplayTab from './components/InstallOpenReplayTab';
import IntegrationsTab from './components/IntegrationsTab';
import ManageUsersTab from './components/ManageUsersTab';
import SideMenu from './components/SideMenu';
import { useTranslation } from 'react-i18next';
import { Smartphone, AppWindow } from 'lucide-react';
import { PANEL_SIZES } from 'App/constants/panelSizes';

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

  const route = (path: string) => withSiteId(onboardingRoute(path));

  const onMenuItemClick = (tab: string) => {
    navigate(withSiteId(onboardingRoute(tab), siteId));
  };

  return (
    <div className="flex relative">
      <SideMenu activeTab={activeTab} onClick={onMenuItemClick} />
      <div className="w-full">
        <div
          className="bg-white w-full rounded-lg mx-auto mb-8 border"
          style={{ maxWidth: PANEL_SIZES.maxWidth }}
        >
          <Routes>
            <Route
              path={route(OB_TABS.INSTALLING)}
              element={
                <InstallOpenReplayTab
                  platforms={platforms}
                  platform={platform}
                  setPlatform={setPlatform}
                  platformMap={platformMap}
                />
              }
            />
            <Route
              path={route(OB_TABS.IDENTIFY_USERS)}
              element={
                <IdentifyUsersTab
                  platforms={platforms}
                  platform={platform}
                  setPlatform={setPlatform}
                  platformMap={platformMap}
                />
              }
            />
            <Route
              path={route(OB_TABS.MANAGE_USERS)}
              element={<ManageUsersTab />}
            />
            <Route
              path={route(OB_TABS.INTEGRATIONS)}
              element={<IntegrationsTab />}
            />
            <Route
              path="*"
              element={<Navigate to={route(OB_TABS.INSTALLING)} replace />}
            />
          </Routes>
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
