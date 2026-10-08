import React from 'react';

import BigNumChart from '../BigNumChart';

interface Props {
  data: any;
  label?: string;
  inGrid?: boolean;
  height?: number;
  [x: string]: any;
}

/** The legacy `progress` view: this period's count against the previous one. */
function CustomMetricPercentage({ data = {}, label, inGrid, height }: Props) {
  return (
    <BigNumChart
      label={label}
      inGrid={inGrid}
      height={height}
      hideLegend
      values={[
        {
          value: Number(data.count ?? 0),
          compData: Number(data.previousCount ?? 0) || undefined,
          series: label ?? '',
        },
      ]}
    />
  );
}

export default CustomMetricPercentage;
