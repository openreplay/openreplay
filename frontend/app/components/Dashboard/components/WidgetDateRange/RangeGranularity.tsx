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
    const defaultOption = Math.max(granularityOptions.length - 2, 0);
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

const PAST_24_HR_MS = 24 * 60 * 60 * 1000;
export function calculateGranularities(periodDurationMs: number) {
  const granularities = [
    { label: 'Hourly', durationMs: 60 * 60 * 1000 },
    { label: 'Daily', durationMs: 24 * 60 * 60 * 1000 },
    { label: 'Weekly', durationMs: 7 * 24 * 60 * 60 * 1000 },
    { label: 'Monthly', durationMs: 30 * 24 * 60 * 60 * 1000 },
    { label: 'Quarterly', durationMs: 3 * 30 * 24 * 60 * 60 * 1000 },
  ];

  const result = [];
  if (periodDurationMs === PAST_24_HR_MS) {
    // if showing for 1 day, show by minute split as well
    granularities.unshift({ label: 'By minute', durationMs: 60 * 1000 });
  }

  for (const granularity of granularities) {
    if (periodDurationMs >= granularity.durationMs) {
      const density = Math.floor(
        Number(BigInt(periodDurationMs) / BigInt(granularity.durationMs)),
      );
      result.push({ label: granularity.label, key: density });
    }
  }

  return result;
}

export default RangeGranularity;
