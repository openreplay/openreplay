import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { Loader, NoContent, SegmentSelection } from 'UI';
import { Styles } from '../../common';
import Period from 'Types/app/period';
import stl from './CustomMetricWidgetPreview.module.css';
import { remove } from 'Duck/customMetrics';
import DateRange from 'Shared/DateRange';
import { edit } from 'Duck/customMetrics';
import CustomMetriLineChart from '../CustomMetriLineChart';
import CustomMetricPercentage from '../CustomMetricPercentage';
import CustomMetricTable from '../CustomMetricTable';
import CustomMetricPieChart from '../CustomMetricPieChart';

const customParams = (rangeName: string) => {
  const params = { density: 70 }

  // if (rangeName === LAST_24_HOURS) params.density = 70
  // if (rangeName === LAST_30_MINUTES) params.density = 70
  // if (rangeName === YESTERDAY) params.density = 70
  // if (rangeName === LAST_7_DAYS) params.density = 70
  
  return params
}

interface Props {
  metric: any;
  data?: any;
  onClickEdit?: (e) => void;
  remove: (id) => void;
  edit: (metric) => void;
}
function CustomMetricWidget(props: Props) {
  const { metric } = props;
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>({ chart: [{}] })
  const [period, setPeriod] = useState(Period({ rangeName: metric.rangeName, startDate: metric.startDate, endDate: metric.endDate }));

  const colors = Styles.customMetricColors;
  const params = customParams(period.rangeName)
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
    setLoading(true);
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
              <span className="color-gray-medium mr-2">Visualization</span>
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
                        // seriesMap={seriesMap}
                        colors={colors}
                        params={params}
                      />
                    )}
                  </>
                )}

                { isTable && (
                  <>
                    { metric.viewType === 'table' ? (
                        <CustomMetricTable metric={metric} data={data[0]} />
                    ) : (
                        <CustomMetricPieChart
                          metric={metric}
                          data={data[0]}
                          colors={colors}
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