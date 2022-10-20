import React from 'react'
import Select from 'Shared/Select';
import ReportTitle from './ReportTitle';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { SeverityLevels } from 'App/mstore/bugReportStore'

const selectOptions = [{ label: 'HIGH', value: SeverityLevels.High }, { label: 'MEDIUM', value: SeverityLevels.Medium }, { label: 'LOW', value: SeverityLevels.Low}]

function Title({ userName }: { userName: string }) {
  const { bugReportStore } = useStore();

  return (
    <div className="flex items-center py-2 px-3 justify-between bg-gray-lightest rounded">
      <div className="flex flex-col gap-2">
        <ReportTitle />
        <div className="text-gray-medium">By {userName}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="font-semibold">Severity</div>
        <Select plain controlStyle={{ minWidth: 100 }} defaultValue={SeverityLevels.High} options={selectOptions} onChange={({ value }) => bugReportStore.setSeverity(value.value) } />
      </div>
    </div>
  );
}

export default observer(Title)
