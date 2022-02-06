import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Loader, NoContent, Icon } from 'UI';
import { widgetHOC, Styles } from '../../common';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area, Tooltip } from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';
import stl from './CustomMetricWidgetPreview.css';
import { getChartFormatter } from 'Types/dashboard/helper'; 
import { remove } from 'Duck/customMetrics';
import { confirm } from 'UI/Confirmation';

import APIClient from 'App/api_client';

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
  metric: any;
  // loading?: boolean;
  data?: any;
  showSync?: boolean;
  compare?: boolean;
  period?: Period;
  onClickEdit?: (e) => void;
  remove: (id) => void;
}
function CustomMetricWidget(props: Props) {
  const { metric, showSync, compare, period = { rangeName: LAST_24_HOURS} } = props;
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>({ chart: [{}] })

  const colors = compare ? Styles.compareColors : Styles.colors;
  const params = customParams(period.rangeName)
  const gradientDef = Styles.gradientDef();
  const metricParams = { ...params, metricId: metric.metricId, viewType: 'lineChart' }

  useEffect(() => {
    // new APIClient()['post']('/custom_metrics/try', { ...metricParams, ...metric.toSaveData() })
    //   .then(response => response.json())
    //   .then(({ errors, data }) => {
    //     if (errors) {
    //       console.log('err', errors)
    //     } else {
    //       const _data = getChartFormatter(period)(data[0]);
    //       // console.log('__data', _data)
    //       setData({ chart: _data });
    //     }
    //   }).finally(() => setLoading(false));
  }, [metric])

  

  return (
    <>
      <div className="flex items-center mb-4">
        <div className="mr-auto font-medium">Preview</div>
        <div></div>
      </div>
      <div className={stl.wrapper}>
        <div>
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
        </div>
      </div>
    </>
  );
}

export default connect(null, { remove })(CustomMetricWidget);