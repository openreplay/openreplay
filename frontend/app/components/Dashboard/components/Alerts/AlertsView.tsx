import { PlusOutlined } from '@ant-design/icons';
import withPageTitle from 'HOCs/withPageTitle';
import { Button } from 'antd';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { PANEL_SIZES } from 'App/constants/panelSizes';
import { useStore } from 'App/mstore';
import { alertCreate, withSiteId } from 'App/routes';
import { useLocation } from 'App/routing';
import { mobileScreen } from 'App/utils/isMobile';
import { Icon, Link, PageTitle } from 'UI';

import AlertsList from './AlertsList';
import AlertsSearch from './AlertsSearch';

interface IAlertsView {
  siteId: string;
}

function AlertsView({ siteId }: IAlertsView) {
  const { t } = useTranslation();
  const location = useLocation();
  const { alertsStore } = useStore();

  useEffect(() => {
    if (!location.pathname.includes('/alert')) {
      alertsStore.updateKey('page', 1);
    }
  }, [location.pathname, alertsStore]);

  return (
    <div
      style={{ maxWidth: PANEL_SIZES.maxWidth, margin: 'auto' }}
      className="bg-white rounded-lg shadow-xs py-4 border"
    >
      <div className="flex items-center mb-2 justify-between px-4 pb-2 border-b">
        <div className="flex items-baseline mr-3">
          <PageTitle title={t('Alerts')} />
        </div>
        <div className="ml-auto flex items-center">
          <Link to={withSiteId(alertCreate(), siteId)}>
            <Button size="small" type="primary" icon={<PlusOutlined />}>
              {mobileScreen ? undefined : t('Create Alert')}
            </Button>
          </Link>
          <div className="min-w-50 md:w-1/4 md:min-w-75">
            <AlertsSearch />
          </div>
        </div>
      </div>
      <AlertsList siteId={siteId} />
    </div>
  );
}

export default withPageTitle('Alerts - OpenReplay')(AlertsView);
