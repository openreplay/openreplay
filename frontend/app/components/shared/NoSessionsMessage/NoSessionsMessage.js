import React from 'react';
import { Alert, Space, Button } from 'antd';
import { observer } from 'mobx-react-lite'
import { useStore } from "App/mstore";
import { onboarding as onboardingRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';
import * as routes from '../../../routes';
import { SquareArrowOutUpRight } from 'lucide-react';
import { useHistory } from 'react-router';

const withSiteId = routes.withSiteId;

const NoSessionsMessage = () => {
  const { projectsStore } = useStore();
  const sites = projectsStore.list;
  const siteId = projectsStore.siteId;
  const history = useHistory();
  const activeSite = sites.find((s) => s.id === siteId);
  const showNoSessions = !!activeSite && !activeSite.recorded;
  const onboardingPath = withSiteId(onboardingRoute('installing'), siteId);

  return (
    <>
      {showNoSessions && (
        <div className="w-full mb-5">
          <Space direction="vertical" className="w-full">
            <Alert
              className="border-transparent rounded-lg w-full"
              message="Your sessions will appear here soon. It may take a few minutes as sessions are optimized for efficient playback."
              type="warning"
              showIcon
              action={
                <Space>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => window.open('https://docs.openreplay.com/en/troubleshooting/session-recordings/', '_blank')}
                    icon={<SquareArrowOutUpRight size={16} />}
                  >
                    Troubleshoot
                  </Button>
                  <Button
                    type="default"
                    size="small"
                    onClick={() => history.push(onboardingPath)}
                  >
                    Complete Project Setup
                  </Button>
                </Space>
              }
            />
          </Space>
        </div>
      )}
    </>
  );
};

export default withRouter(observer(NoSessionsMessage));
