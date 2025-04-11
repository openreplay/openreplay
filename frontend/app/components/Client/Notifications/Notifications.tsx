import React, { useEffect } from 'react';
import cn from 'classnames';
import { Switch } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import withPageTitle from 'HOCs/withPageTitle';
import stl from './notifications.module.css';
import { useTranslation } from 'react-i18next';

function Notifications() {
  const { weeklyReportStore } = useStore();
  const { t } = useTranslation();

  useEffect(() => {
    void weeklyReportStore.fetchReport();
  }, []);

  const onChange = () => {
    const newValue = !weeklyReportStore.weeklyReport;
    void weeklyReportStore.fetchEditReport(newValue);
  };

  return (
    <div className="bg-white rounded-lg p-5">
      <div className={stl.tabHeader}>
        <h3 className={cn(stl.tabTitle, 'text-2xl')}>{t('Weekly Report')}</h3>
      </div>
      <div className="">
        <div className="text-lg font-medium">{t('Weekly project summary')}</div>
        <div className="mb-4">
          {t('Receive weekly report for each project on email.')}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={weeklyReportStore.weeklyReport}
            onChange={onChange}
          />
          <span>{weeklyReportStore.weeklyReport ? t('Yes') : t('No')}</span>
        </div>
      </div>
    </div>
  );
}

export default withPageTitle('Weekly Report - OpenReplay Preferences')(
  observer(Notifications),
);
