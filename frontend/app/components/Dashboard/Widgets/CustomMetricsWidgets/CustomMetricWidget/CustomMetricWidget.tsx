import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Loader, NoContent, Icon } from 'UI';
import { Styles } from '../../common';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area, Tooltip } from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';
import stl from './CustomMetricWidget.css';
import { getChartFormatter, getStartAndEndTimestampsByDensity } from 'Types/dashboard/helper'; 
import { edit, remove, setAlertMetricId, setActiveWidget } from 'Duck/customMetrics';
import { confirm } from 'UI/Confirmation';
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
  edit: (setDefault?) => void;
  setActiveWidget: (widget) => void;
}
function CustomMetricWidget(props: Props) {
  const { metric, showSync, compare, period } = props;
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>({ chart: [] })

  const colors = compare ? Styles.compareColors : Styles.colors;
  const params = customParams(period.rangeName)
  const gradientDef = Styles.gradientDef();
  const metricParams = { ...params, metricId: metric.metricId, viewType: 'lineChart' }

  useEffect(() => {
    new APIClient()['post']('/custom_metrics/chart', { ...metricParams, q: metric.name })
      .then(response => response.json())
      .then(({ errors, data }) => {
        if (errors) {
          console.log('err', errors)
        } else {
          const _data = getChartFormatter(period)(data[0]);
          setData({ chart: _data });
        }
      }).finally(() => setLoading(false));
  }, [period])

  const deleteHandler = async () => {
    if (await confirm({
      header: 'Custom Metric',
      confirmButton: 'Delete',
      confirmation: `Are you sure you want to delete ${metric.name}`
    })) {
      props.remove(metric.metricId)
    }
  }

  const clickHandler = (event, index) => {
    const timestamp = event.activePayload[0].payload.timestamp;
    const { startTimestamp, endTimestamp } = getStartAndEndTimestampsByDensity(timestamp, period.start, period.end, params.density);
    props.setActiveWidget({ widget: metric, startTimestamp, endTimestamp, timestamp: event.activePayload[0].payload.timestamp, index })
  }

  // const onAlertClick = () => {
  //   props.setShowAlerts(true)
  //   props.setAlertMetricId(metric.metricId)
  // }

  return (
    <div className={stl.wrapper}>
      <div className="flex items-center mb-10 p-2">
        <div className="font-medium">{metric.name + ' ' + metric.metricId}</div>
        <div className="ml-auto flex items-center">
          <div className="cursor-pointer mr-6" onClick={deleteHandler}>
            <Icon name="trash" size="14" />
          </div>
          <div className="cursor-pointer mr-6" onClick={() => props.edit(metric)}>
            <Icon name="pencil" size="14" />
          </div>
          <div className="cursor-pointer" onClick={props.onAlertClick}>
            <Icon name="bell-plus" size="14" />
          </div>
        </div>
      </div>
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
                onClick={clickHandler}
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
  );
}

export default connect(state => ({
  period: state.getIn(['dashboard', 'period']),
}), { remove, setShowAlerts, setAlertMetricId, edit, setActiveWidget })(CustomMetricWidget);