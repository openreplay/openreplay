import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { Loader, NoContent, SegmentSelection, Icon } from 'UI';
import { Styles } from '../../common';
// import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';
import Period, { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';
import stl from './CustomMetricWidgetPreview.css';
import { getChartFormatter } from 'Types/dashboard/helper'; 
import { remove } from 'Duck/customMetrics';
import DateRange from 'Shared/DateRange';
import { edit } from 'Duck/customMetrics';
import CustomMetriLineChart from '../CustomMetriLineChart';
import CustomMetricPercentage from '../CustomMetricPercentage';
import CustomMetricTable from '../CustomMetricTable';

import APIClient from 'App/api_client';
import CustomMetricPieChart from '../CustomMetricPieChart';

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
  const isTimeSeries = metric.metricType === 'timeseries';
  const isTable = metric.metricType === 'table';

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

  const chagneViewType = (e, { name, value }) => {
    props.edit({ [ name ]: value });
  }

  return (
    <div className="mb-10">
      <div className="flex items-center">
        <div className="mr-auto font-medium">Preview</div>
        <div className="flex items-center">
          {isTimeSeries && (
            <>
              <span className="mr-1 color-gray-medium">Visualization</span>
              <SegmentSelection
                name="viewType"
                className="my-3"
                primary
                icons={true}
                onSelect={ chagneViewType }
                value={{ value: metric.viewType }}
                list={ [
                  { value: 'lineChart', name: 'Chart', icon: 'graph-up-arrow' },
                  { value: 'progress', name: 'Progress', icon: 'hash' },
                ]}
              />
            </>
          )}

          {isTable && (
            <>
              <span className="mr-1 color-gray-medium">Visualization</span>
              <SegmentSelection
                name="viewType"
                className="my-3"
                primary={true}
                icons={true}
                onSelect={ chagneViewType }
                value={{ value: metric.viewType }}
                list={[
                  { value: 'table', name: 'Table', icon: 'table' },
                  { value: 'pieChart', name: 'Chart', icon: 'pie-chart-fill' },
                ]}
              />
            </>
          )}
          <div className="mx-4" />
          <span className="mr-1 color-gray-medium">Time Range</span>
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
        <div className={stl.innerWapper}>
          <Loader loading={ loading } size="small">
            <NoContent
              size="small"
              show={ data.length === 0 }
            >
              <div className="p-4 font-medium">
                {metric.name}
              </div>
             <div className="px-4 pb-4">
              { isTimeSeries && (
                  <>
                    { metric.viewType === 'progress' && (
                      <CustomMetricPercentage
                        data={data[0]}
                        colors={colors}
                        params={params}
                      />
                    )}
                    { metric.viewType === 'lineChart' && (
                      <CustomMetriLineChart
                        data={data}
                        seriesMap={seriesMap}
                        colors={colors}
                        params={params}
                      />
                    )}
                  </>
                )}

                { isTable && (
                  <>
                    { metric.viewType === 'table' ? (
                        <CustomMetricTable data={data[0]} />
                    ) : (
                        <CustomMetricPieChart
                          metric={metric}
                          data={data[0]}
                          colors={colors}
                          params={params}
                        />
                    )}
                  </>
                )}
             </div>
            </NoContent>
          </Loader>
        </div>
      </div>
    </div>
  );
}

export default connect(null, { remove, edit })(CustomMetricWidget);