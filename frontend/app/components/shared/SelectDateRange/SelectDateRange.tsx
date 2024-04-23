import { DownOutlined } from '@ant-design/icons';
import Period from 'Types/app/period';
import { Dropdown, DatePicker } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { components } from 'react-select';

import { CUSTOM_RANGE, DATE_RANGE_OPTIONS } from 'App/dateRange';

import DateRangePopup from 'Shared/DateRangeDropdown/DateRangePopup';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import Select from 'Shared/Select';

interface Props {
  period: any;
  onChange: (data: any) => void;
  disableCustom?: boolean;
  right?: boolean;
  timezone?: string;
  isAnt?: boolean;
  small?: boolean;

  [x: string]: any;
}

function SelectDateRange(props: Props) {
  const [isCustom, setIsCustom] = React.useState(false);
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);
  const { right = false, period, disableCustom = false, timezone } = props;
  let selectedValue = DATE_RANGE_OPTIONS.find(
    (obj: any) => obj.value === period.rangeName
  );
  const options = DATE_RANGE_OPTIONS.filter((obj: any) =>
    disableCustom ? obj.value !== CUSTOM_RANGE : true
  );

  const onChange = (value: any) => {
    if (value === CUSTOM_RANGE) {
      setTimeout(() => {
        setIsCustom(true);
      }, 1);
    } else {
      // @ts-ignore
      props.onChange(new Period({ rangeName: value }));
    }
  };

  const onApplyDateRange = (value: any) => {
    // @ts-ignore
    const range = new Period({
      rangeName: CUSTOM_RANGE,
      start: value.start,
      end: value.end,
    });
    props.onChange(range);
    setIsCustom(false);
  };

  const isCustomRange = period.rangeName === CUSTOM_RANGE;
  const customRange = isCustomRange ? period.rangeFormatted() : '';

  if (props.isAnt) {
    const onAntUpdate = (val: any) => {
      onChange(val);
    };
    return (
      <div className={'relative'}>
        <Dropdown
          menu={{
            items: options.map((opt) => ({
              label: opt.label,
              key: opt.value,
            })),
            defaultSelectedKeys: selectedValue?.value
              ? [selectedValue.value]
              : undefined,
            onClick: (e: any) => {
              onChange(e.key);
            },
          }}
          onChange={onAntUpdate}
          style={{ width: 170 }}
          defaultValue={selectedValue?.value ?? undefined}
        >
          <div
            className={'cursor-pointer font-semibold flex items-center gap-2'}
          >
            <div>{isCustomRange ? customRange : selectedValue?.label}</div>
            <DownOutlined />
          </div>
        </Dropdown>
        {isCustom && (
          <OutsideClickDetectingDiv
            onClickOutside={(e: any) => {
              if (
                e.target.parentElement.parentElement.classList.contains(
                  'rc-time-picker-panel-select'
                ) ||
                e.target.parentElement.parentElement.classList[0]?.includes(
                  '-menu'
                )
                || e.target.className.includes(
                  'ant-picker'
                )
              ) {
                return false;
              }
              setIsCustom(false);
            }}
          >
            <div
              className={cn(
                'absolute top-0 mt-10 z-40',
                { 'right-0': right }
              )}
              style={{
                width: '770px',
                fontSize: '14px',
                textAlign: 'left',
              }}
            >
              <DateRangePopup
                timezone={timezone}
                onApply={onApplyDateRange}
                onCancel={() => setIsCustom(false)}
                selectedDateRange={period.range}
              />
            </div>
          </OutsideClickDetectingDiv>
        )}
      </div>
    );
  }
  return (
    <div className="relative">
      <Select
        plain
        value={selectedValue}
        options={options}
        onChange={({ value }: any) => onChange(value.value)}
        components={{
          SingleValue: ({ children, ...props }: any) => {
            return (
              <components.SingleValue {...props}>
                {isCustomRange ? customRange : children}
              </components.SingleValue>
            );
          },
        }}
        period={period}
        right={true}
        style={{ width: '100%' }}
      />
      {isCustom && (
        <OutsideClickDetectingDiv
          onClickOutside={(e: any) => {
            if (
              e.target.parentElement.parentElement.classList.contains(
                'rc-time-picker-panel-select'
              ) ||
              e.target.parentElement.parentElement.classList[0]?.includes(
                '-menu'
              )
            ) {
              return false;
            }
            console.log('outside');
            setIsCustom(false);
          }}
        >
          <div
            className={cn('absolute top-0 mt-10 z-40', { 'right-0': right })}
            style={{
              width: '770px',
              fontSize: '14px',
              textAlign: 'left',
            }}
          >
            <DateRangePopup
              timezone={timezone}
              onApply={onApplyDateRange}
              onCancel={() => setIsCustom(false)}
              selectedDateRange={period.range}
            />
          </div>
        </OutsideClickDetectingDiv>
      )}
    </div>
  );
}

export default observer(SelectDateRange);
