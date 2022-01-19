import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles } from '../../common';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area, Tooltip } from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';
import CustomMetricWidgetHoc from '../../common/CustomMetricWidgetHoc';

const customParams = rangeName => {
  const params = { density: 70 }

  if (rangeName === LAST_24_HOURS) params.density = 70
  if (rangeName === LAST_30_MINUTES) params.density = 70
  if (rangeName === YESTERDAY) params.density = 70
  if (rangeName === LAST_7_DAYS) params.density = 70
  
  return params
}

interface Period {
  rangeName: string;
}

interface Props {
  widget: any;
  loading?: boolean;
  data?: any;
  showSync?: boolean;
  compare?: boolean;
  period?: Period;
}
function CustomMetricWidget(props: Props) {
  const { widget, loading = false, data = { chart: []}, showSync, compare, period = { rangeName: ''} } = props;

  const colors = compare ? Styles.compareColors : Styles.colors;
  const params = customParams(period.rangeName)
  const gradientDef = Styles.gradientDef();
  return (
    <Loader loading={ loading } size="small">
      <NoContent
        size="small"
        show={ data.chart.length === 0 }
      >
        <ResponsiveContainer height={ 240 } width="100%">
          <AreaChart
            data={ data.chart }
            margin={Styles.chartMargins}
            syncId={ showSync ? "impactedSessionsBySlowPages" : undefined }
          >
            {gradientDef}
            <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
            <XAxis {...Styles.xaxis} dataKey="time" interval={params.density/7} />
            <YAxis
              {...Styles.yaxis}
              label={{ ...Styles.axisLabelLeft, value: "Number of Requests" }}
              allowDecimals={false}
            />
            <Tooltip {...Styles.tooltip} />
            <Area
              name="Sessions"
              type="monotone"
              dataKey="count"
              stroke={colors[0]}
              fillOpacity={ 1 }
              strokeWidth={ 2 }
              strokeOpacity={ 0.8 }
              fill={compare ? 'url(#colorCountCompare)' : 'url(#colorCount)'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </NoContent>
    </Loader>
  );
}

export default CustomMetricWidgetHoc(CustomMetricWidget);