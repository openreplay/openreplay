import React from 'react'
import AntlikeDropdown from "Shared/Dropdown";
import { DownOutlined } from "@ant-design/icons";

function RangeGranularity({
  period,
  density,
  onDensityChange
}: {
  period: any,
  density: number,
  onDensityChange: (density: number) => void
}) {
  const granularityOptions = React.useMemo(() => {
    return calculateGranularities(period.getDuration());
  }, [period]);

  const menuProps = {
    items: granularityOptions,
    onClick: (item: any) => onDensityChange(item.key),
  }
  const selected = React.useMemo(() => {
    let selected = 'Custom';
    for (const option of granularityOptions) {
      if (option.key <= density) {
        selected = option.label;
        break;
      }
    }
    return selected;
  }, [])
  return (
    <AntlikeDropdown
      useButtonStyle
      label={selected}
      rightIcon={<DownOutlined />}
      menuProps={menuProps}
    />
  )
}

function calculateGranularities(periodDurationMs: number) {
  const granularities = [
    { label: 'Minute', durationMs: 60 * 1000 },
    { label: 'Hourly', durationMs: 60 * 60 * 1000 },
    { label: 'Daily', durationMs: 24 * 60 * 60 * 1000 },
    { label: 'Weekly', durationMs: 7 * 24 * 60 * 60 * 1000 },
    { label: 'Monthly', durationMs: 30 * 24 * 60 * 60 * 1000 },
    { label: 'Quarterly', durationMs: 3 * 30 * 24 * 60 * 60 * 1000 },
  ];

  const result = [];

  for (const granularity of granularities) {
    if (periodDurationMs >= granularity.durationMs) {
      const density = Math.floor(periodDurationMs / granularity.durationMs);
      result.push({ label: granularity.label, key: density });
    }
  }

  return result;
}

export default RangeGranularity;