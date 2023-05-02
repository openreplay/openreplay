import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import { Tooltip } from 'UI';

function ReportTitle() {
  const { bugReportStore } = useStore();
  const inputRef = React.createRef<HTMLInputElement>();

  const toggleEdit = () => {
    bugReportStore.toggleTitleEdit(true);
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (bugReportStore.isTitleEdit && e.key === 'Enter') {
        inputRef.current?.blur();
        bugReportStore.toggleTitleEdit(false);
      }
    }

    document.addEventListener('keydown', handler, false)

    return () => document.removeEventListener('keydown', handler)
  })

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
          name="reportTitle"
          className="rounded fluid border-0 -mx-2 px-2 h-8 text-2xl"
          value={bugReportStore.reportTitle}
          onChange={(e) => bugReportStore.setTitle(e.target.value)}
          onBlur={() => bugReportStore.toggleTitleEdit(false)}
          onFocus={() => bugReportStore.toggleTitleEdit(true)}
        />
      ) : (
        // @ts-ignore
        <Tooltip delay={200} title="Double click to edit">
          <div
            onDoubleClick={toggleEdit}
            className={cn(
              'color-teal text-2xl h-8 flex items-center border-transparent',
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
