import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { Loader, NoContent, Icon } from 'UI';
import { Styles } from '../../common';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';
import Period, { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';
import stl from './CustomMetricWidgetPreview.css';
import { getChartFormatter } from 'Types/dashboard/helper'; 
import { remove } from 'Duck/customMetrics';
import DateRange from 'Shared/DateRange';
import { edit } from 'Duck/customMetrics';

import APIClient from 'App/api_client';

const customParams = rangeName => {
  const params = { density: 70 }

  if (rangeName === LAST_24_HOURS) params.density = 70
  if (rangeName === LAST_30_MINUTES) params.density = 70
  if (rangeName === YESTERDAY) params.density = 70
  if (rangeName === LAST_7_DAYS) params.density = 70
  
  return params
}

interface Props {
  metric: any;
  data?: any;
  showSync?: boolean;
  // compare?: boolean;
  onClickEdit?: (e) => void;
  remove: (id) => void;
  edit: (metric) => void;
}
function CustomMetricWidget(props: Props) {
  const { metric, showSync } = props;
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>({ chart: [{}] })
  const [seriesMap, setSeriesMap] = useState<any>([]);
  const [period, setPeriod] = useState(Period({ rangeName: metric.rangeName, startDate: metric.startDate, endDate: metric.endDate }));

  const colors = Styles.customMetricColors;
  const params = customParams(period.rangeName)
  const gradientDef = Styles.gradientDef();
  const metricParams = { ...params, metricId: metric.metricId, viewType: 'lineChart' }

  const prevMetricRef = useRef<any>();

  useEffect(() => {
    // Check for title change
    if (prevMetricRef.current && prevMetricRef.current.name !== metric.name) {
      prevMetricRef.current = metric;
      return
    };
    prevMetricRef.current = metric;
    
    // fetch new data for the widget preview
    new APIClient()['post']('/custom_metrics/try', { ...metricParams, ...metric.toSaveData() })
      .then(response => response.json())
      .then(({ errors, data }) => {
        if (errors) {
          console.log('err', errors)
        } else {
          const namesMap = data
            .map(i => Object.keys(i))
            .flat()
            .filter(i => i !== 'time' && i !== 'timestamp')
            .reduce((unique: any, item: any) => {
              if (!unique.includes(item)) {
                unique.push(item);
              }
              return unique;
            }, []);

          setSeriesMap(namesMap);
          setData(getChartFormatter(period)(data));
        }
      }).finally(() => setLoading(false));
  }, [metric])

  const onDateChange = (changedDates) => {
    setPeriod({  ...changedDates, rangeName: changedDates.rangeValue })
    props.edit({  ...changedDates, rangeName: changedDates.rangeValue });
  }

  return (
    <div className="mb-10">
      <div className="flex items-center mb-4">
        <div className="mr-auto font-medium">Preview</div>
        <div>
          <DateRange
            rangeValue={metric.rangeName}
            startDate={metric.startDate}
            endDate={metric.endDate}
            onDateChange={onDateChange}
            customRangeRight
            direction="left"
          />
        </div>
      </div>
      <div className={stl.wrapper}>
        <div>
          <Loader loading={ loading } size="small">
            <NoContent
              size="small"
              show={ data.length === 0 }
            >
              <ResponsiveContainer height={ 240 } width="100%">
                <LineChart
                  data={ data }
                  margin={Styles.chartMargins}
                  syncId={ showSync ? "domainsErrors_4xx" : undefined }
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                  <XAxis
                    {...Styles.xaxis}
                    dataKey="time"
                    interval={params.density/7}
                  />
                  <YAxis 
                    {...Styles.yaxis}
                    allowDecimals={false}
                    label={{  
                      ...Styles.axisLabelLeft,
                      value: "Number of Sessions"
                    }}
                  />
                  <Legend />
                  <Tooltip {...Styles.tooltip} />
                  { seriesMap.map((key, index) => (
                    <Line
                      key={key}
                      name={key}
                      type="monotone"
                      dataKey={key}
                      stroke={colors[index]}
                      fillOpacity={ 1 }
                      strokeWidth={ 2 }
                      strokeOpacity={ 0.6 }
                      // fill="url(#colorCount)"
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </NoContent>
          </Loader>
        </div>
      </div>
    </div>
  );
}

export default connect(null, { remove, edit })(CustomMetricWidget);