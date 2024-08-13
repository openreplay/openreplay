import React from 'react';
import { DownOutlined } from '@ant-design/icons';
import Period from 'Types/app/period';
import { Dropdown, Button, Menu, Space, MenuProps } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';

import { CUSTOM_RANGE, DATE_RANGE_OPTIONS } from 'App/dateRange';

import DateRangePopup from 'Shared/DateRangeDropdown/DateRangePopup';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

interface Props {
  period: any;
  onChange: (data: any) => void;
  disableCustom?: boolean;
  right?: boolean;
  timezone?: string;
  isAnt?: boolean;
  small?: boolean;
  useButtonStyle?: boolean;  // New prop to control button style

  [x: string]: any;
}

const SelectDateRange: React.FC<Props> = (props: Props) => {
  const [isCustom, setIsCustom] = React.useState(false);
  const { right = false, period, disableCustom = false, timezone, useButtonStyle = false } = props;
  let selectedValue = DATE_RANGE_OPTIONS.find(
    (obj: any) => obj.value === period.rangeName
  );
  const options = DATE_RANGE_OPTIONS.filter((obj: any) =>
    disableCustom ? obj.value !== CUSTOM_RANGE : true
  );

  const onChange = (e: any) => {
    if (e.key === CUSTOM_RANGE) {
      setTimeout(() => {
        setIsCustom(true);
      }, 1);
    } else {
      props.onChange(Period({ rangeName: e.key }));
    }
  };

  const onApplyDateRange = (value: any) => {
    const range = Period({
      rangeName: CUSTOM_RANGE,
      start: value.start,
      end: value.end
    });
    props.onChange(range);
    setIsCustom(false);
  };

  const isCustomRange = period.rangeName === CUSTOM_RANGE;
  const customRange = isCustomRange ? period.rangeFormatted() : '';

  const menuItems: MenuProps['items'] = options.map((opt) => ({
    key: opt.value,
    label: opt.label,
    className: opt.value === selectedValue?.value ? 'ant-select-item-option-selected' : '',
  }));

  return (
    <div className={'relative'}>
      <Dropdown menu={{ items: menuItems, onClick: onChange, selectedKeys: [selectedValue?.value!] }} trigger={['click']}>
        {useButtonStyle ? (
          <Button type="text">
            <span>{isCustomRange ? customRange : selectedValue?.label}</span>
            <DownOutlined />
          </Button>
        ) : (
          <div className={'cursor-pointer flex items-center gap-2'}>
            <span>{isCustomRange ? customRange : selectedValue?.label}</span>
            <DownOutlined />
          </div>
        )}
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
              ) ||
              e.target.className.includes('ant-picker')
            ) {
              return false;
            }
            setIsCustom(false);
          }}
        >
          <div
            className={cn('absolute top-0 mt-10 z-40', { 'right-0': right })}
            style={{
              width: '770px',
              fontSize: '14px',
              textAlign: 'left'
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
};

export default observer(SelectDateRange);
