import React, { useEffect } from 'react';
import cn from 'classnames';
import stl from './notifications.module.css';
import { Toggler } from 'UI';
import { useStore } from "App/mstore";
import { observer } from 'mobx-react-lite'
import withPageTitle from 'HOCs/withPageTitle';

function Notifications() {
  const { weeklyReportStore } = useStore()


  useEffect(() => {
    void weeklyReportStore.fetchReport()
  }, []);

  const onChange = () => {
    const newValue = !weeklyReportStore.weeklyReport
    void weeklyReportStore.fetchEditReport(newValue)
  };

  return (
    <div className="bg-white rounded-lg p-5">
      <div className={stl.tabHeader}>{<h3 className={cn(stl.tabTitle, 'text-2xl')}>{'Weekly Report'}</h3>}</div>
      <div className="">
        <div className="text-lg font-medium">Weekly project summary</div>
        <div className="mb-4">Receive weekly report for each project on email.</div>
        <Toggler
          checked={weeklyReportStore.weeklyReport}
          name="test"
          onChange={onChange}
          label={weeklyReportStore.weeklyReport ? 'Yes' : 'No'}
        />
      </div>
    </div>
  );
}

export default withPageTitle('Weekly Report - OpenReplay Preferences')(observer(Notifications))