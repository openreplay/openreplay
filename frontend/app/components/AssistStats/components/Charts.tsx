import { useChartTheme } from '@/ui/data/chart';
import { NoContent } from '@/ui/feedback/NoContent';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Sparkline, { withAlpha } from 'Components/Charts/Sparkline';

interface Props {
  data: any;
  label: string;
}

function Chart(props: Props) {
  const { t } = useTranslation();
  const c = useChartTheme().series[0] ?? '';
  const { data, label } = props;

  return (
    <NoContent
      size="small"
      title={
        <div className="text-base font-normal">{t('No data available')}</div>
      }
      show={data && data.length === 0}
      style={{ height: '100px' }}
    >
      <Sparkline
        data={data}
        valueKey="value"
        name={label}
        type="area"
        height={90}
        color={c}
        gradient={[withAlpha(c, 0.35), withAlpha(c, 0.05)]}
        strokeColor={c}
        strokeWidth={2}
        strokeOpacity={0.8}
      />
    </NoContent>
  );
}

export default Chart;
