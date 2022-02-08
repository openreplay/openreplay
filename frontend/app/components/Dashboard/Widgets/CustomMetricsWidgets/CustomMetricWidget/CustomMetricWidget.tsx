import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Loader, NoContent, Icon, Popup } from 'UI';
import { Styles } from '../../common';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area, Tooltip } from 'recharts';
import { LineChart, Line, Legend } from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';
import stl from './CustomMetricWidget.css';
import { getChartFormatter, getStartAndEndTimestampsByDensity } from 'Types/dashboard/helper'; 
import { init, edit, remove, setAlertMetricId, setActiveWidget, updateActiveState } from 'Duck/customMetrics';
import APIClient from 'App/api_client';
import { setShowAlerts } from 'Duck/dashboard';

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
  // loading?: boolean;
  data?: any;
  showSync?: boolean;
  compare?: boolean;
  period?: any;
  onClickEdit: (e) => void;
  remove: (id) => void;
  setShowAlerts: (showAlerts) => void;
  setAlertMetricId: (id) => void;
  onAlertClick: (e) => void;
  init: (metric) => void;
  edit: (setDefault?) => void;
  setActiveWidget: (widget) => void;
  updateActiveState: (metricId, state) => void;
}
function CustomMetricWidget(props: Props) {
  const { metric, showSync, compare, period } = props;
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>([]);
  const [seriesMap, setSeriesMap] = useState<any>([]);

  const colors = Styles.customMetricColors;
  const params = customParams(period.rangeName)
  const gradientDef = Styles.gradientDef();
  const metricParams = { ...params, metricId: metric.metricId, viewType: 'lineChart', startDate: period.start, endDate: period.end }

  useEffect(() => {
    new APIClient()['post']('/custom_metrics/chart', { ...metricParams, q: metric.name })
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
  }, [period])

  const clickHandler = (event, index) => {
    if (event) {
      const payload = event.activePayload[0].payload;
      const timestamp = payload.timestamp;
      const { startTimestamp, endTimestamp } = getStartAndEndTimestampsByDensity(timestamp, period.start, period.end, params.density);
      props.setActiveWidget({ widget: metric, startTimestamp, endTimestamp, timestamp: payload.timestamp, index })
    }
  }

  const updateActiveState = (metricId, state) => {
    props.updateActiveState(metricId, state);
  }

  return (
    <div className={stl.wrapper}>
      <div className="flex items-center mb-10 p-2">
        <div className="font-medium">{metric.name}</div>
        <div className="ml-auto flex items-center">
          <WidgetIcon className="cursor-pointer mr-6" icon="bell-plus" tooltip="Set Alert" onClick={props.onAlertClick} />
          <WidgetIcon className="cursor-pointer mr-6" icon="pencil" tooltip="Edit Metric" onClick={() => props.init(metric)} />
          <WidgetIcon className="cursor-pointer" icon="close" tooltip="Hide Metric" onClick={() => updateActiveState(metric.metricId, false)} />
        </div>
      </div>
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
                onClick={clickHandler}
              >
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[4]} stopOpacity={ 0.9 } />
                    <stop offset="95%" stopColor={colors[4]} stopOpacity={ 0.2 } />
                  </linearGradient>
                </defs>
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
                    strokeOpacity={ 0.8 }
                    fill="url(#colorCount)"
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </NoContent>
        </Loader>
      </div>
    </div>
  );
}

export default connect(state => ({
  period: state.getIn(['dashboard', 'period']),
}), {
  remove,
  setShowAlerts,
  setAlertMetricId,
  edit,
  setActiveWidget,
  updateActiveState,
  init,
})(CustomMetricWidget);


const WidgetIcon = ({ className = '', tooltip = '', icon, onClick }) => (
  <Popup
    size="small"
    trigger={
      <div className={className} onClick={onClick}>
        <Icon name={icon} size="14" />
      </div>
    }
    content={tooltip}
    position="top center"
    inverted
  />
)