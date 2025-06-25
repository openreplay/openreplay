import React from 'react';
import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps } from 'antd';

function RangeGranularity({
  period,
  density,
  onDensityChange,
}: {
  period: {
    getDuration(): number;
  };
  density: number;
  onDensityChange: (density: number) => void;
}) {
  const granularityOptions = React.useMemo(() => {
    if (!period) return [];
    return calculateGranularities(period.getDuration());
  }, [period]);

  const menuProps: MenuProps = {
    items: granularityOptions,
    onClick: (item: any) => onDensityChange(Number(item.key)),
  };
  const selected = React.useMemo(() => {
    let selected = 'Custom';
    for (const option of granularityOptions) {
      if (option.key === density) {
        selected = option.label;
        break;
      }
    }
    return selected;
  }, [period, density]);

  React.useEffect(() => {
    if (granularityOptions.length === 0) return;
    const defaultOption = Math.max(granularityOptions.filter(opt => !opt.disabled).length - 2, 0);
    onDensityChange(granularityOptions[defaultOption].key);
  }, [period, granularityOptions.length]);

  return (
    <Dropdown menu={menuProps} trigger={['click']}>
      <Button
        type="text"
        variant="text"
        size="small"
        className="btn-granularity"
      >
        <span>{selected}</span>
        <DownOutlined />
      </Button>
    </Dropdown>
  );
}

export function calculateGranularities(periodDurationMs: number) {
  const granularities = [
    { label: 'Hourly', durationMs: 60 * 60 * 1000, disabled: false },
    { label: 'Daily', durationMs: 24 * 60 * 60 * 1000, disabled: false },
    { label: 'Weekly', durationMs: 7 * 24 * 60 * 60 * 1000, disabled: false },
    { label: 'Monthly', durationMs: 30 * 24 * 60 * 60 * 1000, disabled: false },
    {
      label: 'Quarterly',
      durationMs: 3 * 30 * 24 * 60 * 60 * 1000,
      disabled: false,
    },
  ];

  const result = [];
  for (const granularity of granularities) {
    const density = Math.floor(
      Number(BigInt(periodDurationMs) / BigInt(granularity.durationMs)),
    );
    const disabled = periodDurationMs >= granularity.durationMs ? false : true;
    result.push({ label: granularity.label, key: density, disabled });
  }

  return result;
}

export default RangeGranularity;
