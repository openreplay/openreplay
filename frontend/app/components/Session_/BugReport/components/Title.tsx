import React from 'react';
import Select from 'Shared/Select';
import { Icon } from 'UI';
import ReportTitle from './ReportTitle';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { SeverityLevels } from 'App/mstore/bugReportStore';

const selectOptions = [
  {
    label: (
      <div className="flex items-center gap-1 cursor-pointer w-full">
        <Icon name="arrow-up-short" color="red" size="24" />
        HIGH
      </div>
    ),
    value: SeverityLevels.High,
  },
  {
    label: (
      <div className="flex items-center gap-1 cursor-pointer w-full">
        <Icon name="dash" size="24" color="yellow2" />
        MEDIUM
      </div>
    ),
    value: SeverityLevels.Medium,
  },
  {
    label: (
      <div className="flex items-center gap-1 cursor-pointer w-full">
        <Icon name="arrow-down-short" color="teal" size="24" />
        LOW
      </div>
    ),
    value: SeverityLevels.Low,
  },
];

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
        <Select
          plain
          controlStyle={{ minWidth: 115 }}
          defaultValue={SeverityLevels.High}
          options={selectOptions}
          onChange={({ value }) => bugReportStore.setSeverity(value.value)}
        />
      </div>
    </div>
  );
}

export default observer(Title);
