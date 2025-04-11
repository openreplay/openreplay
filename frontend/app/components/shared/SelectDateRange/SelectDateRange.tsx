import { DownOutlined, SyncOutlined } from '@ant-design/icons';
import Period from 'Types/app/period';
import { Dropdown, Button, Tooltip } from 'antd';
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
import { useTranslation } from 'react-i18next';

interface Props {
  period: any | null;
  onChange: (data: any) => void;
  disableCustom?: boolean;
  right?: boolean;
  timezone?: string;
  isAnt?: boolean;
  small?: boolean;
  useButtonStyle?: boolean;
  compPeriod?: any | null;
  onChangeComparison?: (data: any) => void;
  comparison?: boolean;
  updateInstComparison?: (range: [start: string, end?: string] | null) => void;
  [x: string]: any;
  className?: string;
}

function SelectDateRange(props: Props) {
  const { t } = useTranslation();
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
  const dateRangeOptionsLocalized = dateRangeOptions.map((obj: any) => ({
    ...obj,
    label: t(obj.label),
  }));
  const selectedValue = usedPeriod?.rangeName
    ? dateRangeOptionsLocalized.find(
        (obj: any) => obj.value === usedPeriod?.rangeName,
      )
    : null;
  const options = dateRangeOptionsLocalized.filter((obj: any) =>
    disableCustom ? obj.value !== CUSTOM_RANGE : true,
  ).map((obj) => ({ ...obj, label: t(obj.label) }));

  const onChange = (value: any) => {
    if (value === CUSTOM_RANGE) {
      setTimeout(() => {
        setIsCustom(true);
      }, 1);
      return;
    }
    if (props.comparison && props.onChangeComparison) {
      if (!value) {
        props.updateInstComparison?.(null);
        return props.onChangeComparison(null);
      }
      const newPeriod = new Period({
        start: props.period.start,
        end: props.period.end,
        substract: value,
      });
      props.updateInstComparison?.([value]);
      props.onChangeComparison(newPeriod);
    } else {
      props.onChange(new Period({ rangeName: value }));
    }
  };

  const onApplyDateRange = (value: { start: any; end: any }) => {
    if (props.comparison) {
      const day = 86400000;
      const originalPeriodLength = Math.ceil(
        (props.period.end - props.period.start) / day,
      );
      const start = value.start.ts;
      const end = value.start.ts + originalPeriodLength * day;

      const compRange = new Period({
        start,
        end,
        rangeName: CUSTOM_RANGE,
      });
      props.updateInstComparison?.([start.toString(), end.toString()]);
      props.onChangeComparison(compRange);
    } else {
      const range = new Period({
        rangeName: CUSTOM_RANGE,
        start: value.start,
        end: value.end,
      });
      props.onChange(range);
    }
    setIsCustom(false);
  };

  const isCustomRange = usedPeriod
    ? usedPeriod.rangeName === CUSTOM_RANGE
    : false;
  const isUSLocale =
    navigator.language === 'en-US' || navigator.language.startsWith('en-US');
  const customRange = isCustomRange
    ? usedPeriod.rangeFormatted(
        isUSLocale ? 'MMM dd yyyy, hh:mm a' : 'MMM dd yyyy, HH:mm',
      )
    : '';

  const isTileDisabled = ({ date, view }) => {
    if (view !== 'month' || !props.comparison) return false;
    return (
      date.getTime() >= props.period.start && date.getTime() <= props.period.end
    );
  };
  if (props.isAnt) {
    return (
      <AndDateRange
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
        isTileDisabled={isTileDisabled}
      />
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
          SingleValue: ({ children, ...props }: any) => (
            <components.SingleValue {...props}>
              {isCustomRange ? customRange : children}
            </components.SingleValue>
          ),
        }}
        period={period}
        right
        style={{ width: '100%' }}
      />
      {isCustom && (
        <OutsideClickDetectingDiv
          onClickOutside={(e: any) => {
            if (
              e.target.parentElement.parentElement.classList.contains(
                'rc-time-picker-panel-select',
              ) ||
              e.target.parentElement.parentElement.classList[0]?.includes(
                '-menu',
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
  isTileDisabled,
}: Props) {
  const customRangeRef = React.useRef(null);
  const { t } = useTranslation();
  const menuProps = {
    items: options.map((opt: any) => ({
      label: opt.label,
      key: opt.value,
    })),
    selectedKeys: selectedValue?.value ? [selectedValue.value] : undefined,
    onClick: (e: any) => {
      onChange(e.key);
    },
  };

  const comparisonValue =
    isCustomRange && selectedValue ? customRange : selectedValue?.label;
  return (
    <div className="relative">
      {comparison ? (
        <div className="flex items-center gap-0">
          <Dropdown
            menu={menuProps}
            trigger={['click']}
            className="px-2 py-1 gap-1"
          >
            <Button
              type="text"
              variant="text"
              className="flex items-center btn-compare-card-data"
              size="small"
            >
              <span>{`Compare to ${comparisonValue || ''}`}</span>
              {selectedValue && (
                <Tooltip title={t('Reset')}>
                  <SyncOutlined
                    className="cursor-pointer p-2 py-1.5 hover:bg-neutral-200/50 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(null);
                    }}
                  />
                </Tooltip>
              )}
              <DownOutlined className="ms-1" />
            </Button>
          </Dropdown>
        </div>
      ) : (
        <Dropdown menu={menuProps} trigger={['click']}>
          <Button
            type="text"
            size="small"
            className="flex items-center btn-card-period-range"
            icon={useButtonStyle ? <Calendar size={16} /> : null}
          >
            {isCustomRange ? customRange : selectedValue?.label}
            <DownOutlined />
          </Button>
        </Dropdown>
      )}
      {isCustom && (
        <OutsideClickDetectingDiv
          onClickOutside={(e: any) => {
            if (customRangeRef.current && customRangeRef.current.contains(e.target)) {
              return false;
            }
            if (
              e.target.className.includes('react-calendar') ||
              e.target.className.includes('ant-picker')
            ) {
              return false;
            }
            if (
              e.target.parentElement.parentElement.classList.contains(
                'rc-time-picker-panel-select',
              ) ||
              e.target.parentElement.parentElement.classList[0]?.includes(
                '-menu',
              ) ||
              e.target.parentElement.className.includes('react-calendar')
            ) {
              return false
            }
            setIsCustom(false);
          }}
        >
          <div
            ref={customRangeRef}
            className={cn(
              'absolute top-0 mt-10 z-40',
              right ? 'right-0' : 'left-0',
            )}
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
              isTileDisabled={isTileDisabled}
              singleDay={comparison}
            />
          </div>
        </OutsideClickDetectingDiv>
      )}
    </div>
  );
}

export default observer(SelectDateRange);
