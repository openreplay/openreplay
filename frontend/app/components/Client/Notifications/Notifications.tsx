import { toast } from '@/ui/overlays/toast';
import withPageTitle from 'HOCs/withPageTitle';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import { PrefBlock, PrefToggle } from '../PrefSection';

function Notifications() {
  const { weeklyReportStore } = useStore();
  const { t } = useTranslation();

  useEffect(() => {
    void weeklyReportStore.fetchReport();
  }, []);

  const onChange = () => {
    const newValue = !weeklyReportStore.weeklyReport;
    weeklyReportStore
      .fetchEditReport(newValue)
      .catch(() => toast.error(t('Could not update the weekly report')));
  };

  return (
    <PrefBlock
      title={t('Weekly project summary')}
      hint={t('Receive a weekly report for each project by email.')}
    >
      <PrefToggle
        checked={!!weeklyReportStore.weeklyReport}
        onChange={onChange}
        disabled={!weeklyReportStore.loaded}
        label={weeklyReportStore.weeklyReport ? t('On') : t('Off')}
      />
    </PrefBlock>
  );
}

export default withPageTitle('Weekly Report - OpenReplay Preferences')(
  observer(Notifications),
);
