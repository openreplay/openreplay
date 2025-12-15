import React from 'react';
import { CloseCircleFilled } from '@ant-design/icons';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import DateRangePopup from 'Shared/DateRangeDropdown/DateRangePopup';
import Period from 'Types/app/period';
import { formatTimeOrDate } from 'App/date';

interface Props {
  onChange: (value: number | null) => void;
  value: number[];
  placeholder?: string;
}

function FilterTimestamp({ onChange, value, placeholder }: Props) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const onClearClick = () => {
    onChange(null);
  };
  const onApplyDateRange = (value: { start: any; end: any }) => {
    setIsOpen(false);
    onChange([value.start.ts.toString(), value.end.ts.toString()]);
  };

  const isUSLocale =
    navigator.language === 'en-US' || navigator.language.startsWith('en-US');
  const timezone = null;

  const hasValue = value && value.length && value[0];
  const period = hasValue
    ? Period({
        start: value[0],
        end: value.length > 1 ? value[1] : value[0],
        rangeName: 'Custom Range',
      })
    : Period({
        start: Date.now(),
        end: Date.now(),
        rangeName: 'Custom Range',
      });

  const sameValue = hasValue && value.length > 1 && value[0] === value[1];
  const valueStr = hasValue
    ? value.length > 1 && !sameValue
      ? `${formatTimeOrDate(parseInt(value[0]))} - ${formatTimeOrDate(parseInt(value[1]))}`
      : formatTimeOrDate(parseInt(value[0]))
    : null;

  return (
    <div className={'relative'}>
      <div
        ref={parentRef}
        id={'filter-timestamp'}
        className="rounded-lg border group border-gray-light px-2 relative w-full pr-4 whitespace-nowrap flex items-center bg-white hover:border-neutral-400"
        style={{ height: 26, minWidth: 100 }}
        onClick={() => setIsOpen(true)}
      >
        {hasValue ? (
          <div>{valueStr}</div>
        ) : (
          <div className="text-neutral-500/90">
            {placeholder ? placeholder : 'Select value(s)'}
          </div>
        )}
        {value ? (
          <div
            className="hidden group-hover:flex absolute right-2 cursor-pointer items-center justify-center"
            onClick={onClearClick}
          >
            <CloseCircleFilled className="text-neutral-200" />
          </div>
        ) : null}
      </div>
      {isOpen ? (
        <OutsideClickDetectingDiv
          onClickOutside={(e: any) => {
            const insideFilter = parentRef.current?.contains(e.target);
            if (insideFilter) {
              return false;
            }
            setIsOpen(false);
          }}
        >
          <div
            className={'absolute top-0 mt-10 z-40 left-0'}
            style={{
              width: isUSLocale ? '542px' : '520px',
              fontSize: '14px',
              textAlign: 'left',
            }}
          >
            <DateRangePopup
              timezone={timezone}
              onApply={onApplyDateRange}
              onCancel={() => setIsOpen(false)}
              selectedDateRange={period.range}
            />
          </div>
        </OutsideClickDetectingDiv>
      ) : null}
    </div>
  );
}

export default FilterTimestamp;
