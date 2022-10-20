import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import { Tooltip } from 'react-tippy';

function ReportTitle() {
  const { bugReportStore } = useStore();
  const inputRef = React.createRef<HTMLInputElement>();

  const toggleEdit = () => {
    bugReportStore.toggleTitleEdit(true);
  };

  React.useEffect(() => {
    if (inputRef.current && bugReportStore.isTitleEdit) {
      inputRef.current?.focus();
    }
  }, [bugReportStore.isTitleEdit])

  return (
    <div>
      {bugReportStore.isTitleEdit ? (
        <input
          ref={inputRef}
          name="name"
          className="rounded fluid border-0 -mx-2 px-2 h-8 text-2xl"
          value={bugReportStore.reportTitle}
          onChange={(e) => bugReportStore.setTitle(e.target.value)}
          onBlur={() => bugReportStore.toggleTitleEdit(false)}
          onFocus={() => bugReportStore.toggleTitleEdit(true)}
        />
      ) : (
        // @ts-ignore
        <Tooltip delay={100} arrow title="Double click to rename">
          <div
            onDoubleClick={toggleEdit}
            className={cn(
              'text-blue text-2xl h-8 flex items-center border-transparent',
              'cursor-pointer select-none border-b border-b-borderColor-transparent hover:border-dotted hover:border-gray-medium'
            )}
          >
            {bugReportStore.reportTitle}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export default observer(ReportTitle);
