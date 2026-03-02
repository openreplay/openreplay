import React from 'react';

import { PageTitle } from 'UI';

import CreateDashboardButton from 'Components/Dashboard/components/CreateDashboardButton';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import DashboardSearch from './DashboardSearch';
import { useTranslation } from 'react-i18next';

function Header() {
  const { t } = useTranslation();
  const { dashboardStore } = useStore();
  const dashboardsSearch = dashboardStore.filter.query;
  const showSearch = dashboardStore.dashboards.length > 0 || dashboardsSearch;
  return (
    <div className="flex items-center justify-between px-4 pb-2">
      <div className="flex items-baseline mr-3">
        <PageTitle title={t('Dashboards')} />
      </div>
      {showSearch && (
        <div className="ml-auto flex items-center gap-2">
          <CreateDashboardButton />
          <div className="w-full min-w-50 md:w-1/4 md:min-w-75">
            <DashboardSearch />
          </div>
        </div>
      )}
    </div>
  );
}

export default observer(Header);
