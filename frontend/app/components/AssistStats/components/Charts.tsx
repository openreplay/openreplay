import React from 'react';
import { NoContent } from 'UI';
import { Styles } from 'Components/Dashboard/Widgets/common';
import Sparkline from 'Components/Charts/Sparkline';
import { useTranslation } from 'react-i18next';

interface Props {
  data: any;
  label: string;
}

function Chart(props: Props) {
  const { t } = useTranslation();
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
        color={Styles.compareColors[2]}
        gradient={['rgba(128, 141, 255, 0.5)', 'rgba(128, 141, 255, 0.2)']}
        strokeColor={Styles.strokeColor}
        strokeWidth={2}
        strokeOpacity={0.8}
      />
    </NoContent>
  );
}

export default Chart;
