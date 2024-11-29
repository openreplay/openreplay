import { DownOutlined, CloseOutlined } from '@ant-design/icons';
import Period from 'Types/app/period';
import { Dropdown } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { components } from 'react-select';
import {
  CUSTOM_RANGE,
  DATE_RANGE_OPTIONS,
  DATE_RANGE_COMPARISON_OPTIONS,
} from 'App/dateRange';
import { Calendar } from 'lucide-react';
import DateRangePopup from 'Shared/DateRangeDropdown/DateRangePopup';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import Select from 'Shared/Select';
import AntlikeDropdown from "Shared/Dropdown";

interface Props {
  period: any | null;
  onChange: (data: any) => void;
  disableCustom?: boolean;
  right?: boolean;
  timezone?: string;
  isAnt?: boolean;
  small?: boolean;
  useButtonStyle?: boolean; // New prop to control button style
  compPeriod?: any | null;
  onChangeComparison?: (data: any) => void;
  comparison?: boolean;
  [x: string]: any;
}

function SelectDateRange(props: Props) {
  const [isCustom, setIsCustom] = React.useState(false);
  const {
    right = false,
    period,
    disableCustom = false,
    timezone,
    useButtonStyle = false,
  } = props;
  const usedPeriod = props.comparison ? props.compPeriod : period;
  const dateRangeOptions = props.comparison
    ? DATE_RANGE_COMPARISON_OPTIONS
    : DATE_RANGE_OPTIONS;
  let selectedValue = usedPeriod?.rangeName
    ? dateRangeOptions.find((obj: any) => obj.value === usedPeriod?.rangeName)
    : null;
  const options = dateRangeOptions.filter((obj: any) =>
    disableCustom ? obj.value !== CUSTOM_RANGE : true
  );

  const onChange = (value: any) => {
    if (props.comparison) {
      const newPeriod = new Period({
        start: props.period.start,
        end: props.period.end,
        substract: value
      });
      props.onChangeComparison(newPeriod);
      return;
    }

    if (value === CUSTOM_RANGE) {
      setTimeout(() => {
        setIsCustom(true);
      }, 1);
    } else {
      props.onChange(new Period({ rangeName: value }));
    }
  };

  const onApplyDateRange = (value: any) => {
    const range = new Period({
      rangeName: CUSTOM_RANGE,
      start: value.start,
      end: value.end,
    });
    props.onChange(range);
    setIsCustom(false);
  };

  const isCustomRange = usedPeriod ? usedPeriod.rangeName === CUSTOM_RANGE : false;
  const isUSLocale =
    navigator.language === 'en-US' || navigator.language.startsWith('en-US');
  const customRange = isCustomRange
    ? usedPeriod.rangeFormatted(
        isUSLocale ? 'MMM dd yyyy, hh:mm a' : 'MMM dd yyyy, HH:mm'
      )
    : '';

  if (props.isAnt) {
    return <AndDateRange
      {...props}
      options={options}
      selectedValue={selectedValue}
      onChange={onChange}
      isCustomRange={isCustomRange}
      isCustom={isCustom}
      customRange={customRange}
      setIsCustom={setIsCustom}
      onApplyDateRange={onApplyDateRange}
      isUSLocale={isUSLocale}
      useButtonStyle={useButtonStyle}
    />;
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
            setIsCustom(false);
          }}
        >
          <div
            className={cn('absolute top-0 mt-10 z-40', { 'right-0': right })}
            style={{
              width: isUSLocale ? '542px' : '520px',
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

function AndDateRange({
  options,
  selectedValue,
  onChange,
  period,
  timezone,
  right = false,
  useButtonStyle = false,
  comparison = false,
  isCustomRange,
  customRange,
  setIsCustom,
  isCustom,
  isUSLocale,
  onApplyDateRange,
}: Props) {
  const menuProps = {
    items: options.map((opt) => ({
      label: opt.label,
      key: opt.value,
    })),
    selectedKeys: selectedValue?.value ? [selectedValue.value] : undefined,
    onClick: (e: any) => {
      onChange(e.key);
    },
  };

  const comparisonValue = isCustomRange && selectedValue ? customRange : selectedValue?.label;
  return (
    <div className={'relative'}>
      {comparison ? (
        <div className={'flex items-center gap-0'}>
          <Dropdown menu={menuProps} className={'px-2 py-1'}>
            <div
              className={
                'cursor-pointer flex items-center gap-2 border-l border-t border-b border-gray-light rounded-l !border-r-0'
              }
            >
              <span>
                {`Compare to ${comparisonValue || ''}`}
              </span>
              <DownOutlined />
            </div>
          </Dropdown>
          <div
            className={
              'flex items-center justify-center border border-gray-light p-2 hover:border-main rounded-r'
            }
            style={{ height: 30 }}
            onClick={() => onChange(null)}
          >
            <CloseOutlined />
          </div>
        </div>
      ) : (
        <AntlikeDropdown
          label={isCustomRange ? customRange : selectedValue?.label}
          menuProps={menuProps}
          useButtonStyle={useButtonStyle}
          leftIcon={useButtonStyle ? <Calendar size={16} /> : null}
          rightIcon={<DownOutlined />}
        />
      )}
      {isCustom && (
        <OutsideClickDetectingDiv
          onClickOutside={(e: any) => {
            if (
              e.target.className.includes('react-calendar') ||
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
              width: isUSLocale ? '542px' : '500px',
              fontSize: '14px',
              textAlign: 'left',
            }}
          >
            <DateRangePopup
              timezone={timezone}
              onApply={onApplyDateRange}
              onCancel={() => setIsCustom(false)}
              selectedDateRange={period.range}
              className="h-fit"
            />
          </div>
        </OutsideClickDetectingDiv>
      )}
    </div>
  );
}

export default observer(SelectDateRange);
