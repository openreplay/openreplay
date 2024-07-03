import React from 'react';
import { Alert, Space, Button } from 'antd';
import { connect } from 'react-redux';
import { onboarding as onboardingRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';
import * as routes from '../../../routes';
import { indigo } from 'tailwindcss/colors';
import { SquareArrowOutUpRight } from 'lucide-react';
import { useHistory } from 'react-router';


const withSiteId = routes.withSiteId;
const indigoWithOpacity = `rgba(${parseInt(indigo[500].slice(1, 3), 16)}, ${parseInt(indigo[500].slice(3, 5), 16)}, ${parseInt(indigo[500].slice(5, 7), 16)}, 0.1)`; // 0.5 is the opacity level


const NoSessionsMessage = (props) => {
  const {
    sites,
    siteId
  } = props;
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

export default connect((state) => ({
  site: state.getIn(['site', 'siteId']),
  sites: state.getIn(['site', 'list'])
}))(withRouter(NoSessionsMessage));
