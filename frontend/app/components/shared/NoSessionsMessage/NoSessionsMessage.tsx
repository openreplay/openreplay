import React from 'react';
import { Alert, Space, Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { onboarding as onboardingRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';
import { SquareArrowOutUpRight } from 'lucide-react';
import { useHistory } from 'react-router';
import * as routes from '../../../routes';
import { useTranslation } from 'react-i18next';

const { withSiteId } = routes;

function NoSessionsMessage() {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const { siteId } = projectsStore;
  const history = useHistory();
  const activeSite = projectsStore.active;
  const showNoSessions = !!activeSite && !activeSite.recorded;
  const onboardingPath = withSiteId(onboardingRoute('installing'), siteId);

  return (
    <>
      {showNoSessions && (
        <div className="w-full mb-5">
          <Space direction="vertical" className="w-full">
            <Alert
              className="border-transparent rounded-lg w-full"
              message={t(
                'Your sessions will appear here soon. It may take a few minutes as sessions are optimized for efficient playback.',
              )}
              type="warning"
              showIcon
              action={
                <Space>
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      window.open(
                        'https://docs.openreplay.com/en/troubleshooting/session-recordings/',
                        '_blank',
                      )
                    }
                    icon={<SquareArrowOutUpRight size={16} />}
                  >
                    {t('Troubleshoot')}
                  </Button>
                  <Button
                    type="default"
                    size="small"
                    onClick={() => history.push(onboardingPath)}
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

export default withRouter(observer(NoSessionsMessage));
