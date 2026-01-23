import React, { useEffect } from 'react';
import { PageTitle, Icon, Link } from 'UI';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import withPageTitle from 'HOCs/withPageTitle';
import { withSiteId, alertCreate } from 'App/routes';

import { useHistory } from 'react-router';
import { useStore } from 'App/mstore';
import AlertsList from './AlertsList';
import AlertsSearch from './AlertsSearch';
import { useTranslation } from 'react-i18next';
import { PANEL_SIZES } from 'App/constants/panelSizes';
import { mobileScreen } from 'App/utils/isMobile';

interface IAlertsView {
  siteId: string;
}

function AlertsView({ siteId }: IAlertsView) {
  const { t } = useTranslation();
  const history = useHistory();
  const { alertsStore } = useStore();

  useEffect(() => {
    const unmount = history.listen((location) => {
      if (!location.pathname.includes('/alert')) {
        alertsStore.updateKey('page', 1);
      }
    });
    return unmount;
  }, [history]);

  return (
    <div
      style={{ maxWidth: PANEL_SIZES.maxWidth, margin: 'auto' }}
      className="bg-white rounded-lg shadow-xs py-4 border"
    >
      <div className="flex items-center mb-4 justify-between px-6">
        <div className="flex items-baseline mr-3">
          <PageTitle title={t('Alerts')} />
        </div>
        <div className="ml-auto flex items-center">
          <Link to={withSiteId(alertCreate(), siteId)}>
            <Button type="primary" icon={<PlusOutlined />}>
              {mobileScreen ? undefined : t('Create Alert')}
            </Button>
          </Link>
          <div className="ml-4 min-w-[200px] md:w-1/4 md:min-w-[300px]">
            <AlertsSearch />
          </div>
        </div>
      </div>
      <AlertsList siteId={siteId} />
    </div>
  );
}

export default withPageTitle('Alerts - OpenReplay')(AlertsView);
