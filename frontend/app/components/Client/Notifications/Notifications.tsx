import withPageTitle from 'HOCs/withPageTitle';
import { Switch } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import PreferencesPage from '../PreferencesPage';

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
    <PreferencesPage title={t('Weekly Report')}>
      <div>
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
    </PreferencesPage>
  );
}

export default withPageTitle('Weekly Report - OpenReplay Preferences')(
  observer(Notifications),
);
