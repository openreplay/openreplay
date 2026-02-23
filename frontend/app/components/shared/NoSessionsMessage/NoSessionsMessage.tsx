import { trackerInstance } from '@/init/openreplay';
import { Alert, Button, Space } from 'antd';
import { SquareArrowOutUpRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { onboarding as onboardingRoute } from 'App/routes';
import { useNavigate } from 'App/routing';

import * as routes from '../../../routes';

const { withSiteId } = routes;

function NoSessionsMessage() {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const { siteId } = projectsStore;
  const navigate = useNavigate();
  const activeSite = projectsStore.active;
  const showNoSessions = !!activeSite && !activeSite.recorded;
  const onboardingPath = withSiteId(onboardingRoute('installing'), siteId);

  const openTroubleshoot = () => {
    trackerInstance.event('troubleshoot_clicked');
    window.open(
      'https://docs.openreplay.com/en/troubleshooting/session-recordings/',
      '_blank',
    );
  };
  return (
    <>
      {showNoSessions && (
        <div className="w-full mb-5">
          <Space orientation="vertical" className="w-full!">
            <Alert
              className="border-transparent rounded-lg w-full flex flex-col md:flex-row"
              title={t(
                'Your sessions will appear here soon. It may take a few minutes as sessions are optimized for efficient playback.',
              )}
              type="warning"
              showIcon
              action={
                <Space>
                  <Button
                    type="link"
                    size="small"
                    onClick={openTroubleshoot}
                    icon={
                      <div className="color-black fill-black hover:color-primary hover:fill-primary">
                        <SquareArrowOutUpRight size={16} />
                      </div>
                    }
                  >
                    <div className="text-black hover:text-primary">
                      {t('Troubleshoot')}
                    </div>
                  </Button>
                  <Button
                    type="default"
                    size="small"
                    onClick={() => navigate(onboardingPath)}
                  >
                    {t('Complete Project Setup')}
                  </Button>
                </Space>
              }
            />
          </Space>
        </div>
      )}
    </>
  );
}

export default observer(NoSessionsMessage);
