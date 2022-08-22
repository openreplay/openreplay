import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Loader, NoContent, Icon, Popup } from 'UI';
import { Styles } from '../../common';
import { ResponsiveContainer } from 'recharts';
import stl from './CustomMetricWidget.module.css';
import { getStartAndEndTimestampsByDensity } from 'Types/dashboard/helper';
import { init, edit, remove, setAlertMetricId, setActiveWidget, updateActiveState } from 'Duck/customMetrics';
import { setShowAlerts } from 'Duck/dashboard';
import CustomMetriLineChart from '../CustomMetriLineChart';
import CustomMetricPieChart from '../CustomMetricPieChart';
import CustomMetricPercentage from '../CustomMetricPercentage';
import CustomMetricTable from '../CustomMetricTable';
import { NO_METRIC_DATA } from 'App/constants/messages'

const customParams = rangeName => {
  const params = { density: 70 }

  // if (rangeName === LAST_24_HOURS) params.density = 70
  // if (rangeName === LAST_30_MINUTES) params.density = 70
  // if (rangeName === YESTERDAY) params.density = 70
  // if (rangeName === LAST_7_DAYS) params.density = 70

  return params
}

interface Props {
  metric: any;
  // loading?: boolean;
  data?: any;
  compare?: boolean;
  period?: any;
  onClickEdit: (e) => void;
  remove: (id) => void;
  setShowAlerts: (showAlerts) => void;
  setAlertMetricId: (id) => void;
  onAlertClick: (e) => void;
  init: (metric: any) => void;
  edit: (setDefault?) => void;
  setActiveWidget: (widget) => void;
  updateActiveState: (metricId, state) => void;
  isTemplate?: boolean;
}
function CustomMetricWidget(props: Props) {
  const { metric, period, isTemplate } = props;
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>([]);
  // const [seriesMap, setSeriesMap] = useState<any>([]);

  const colors = Styles.customMetricColors;
  const params = customParams(period.rangeName)
  // const metricParams = { ...params, metricId: metric.metricId, viewType: 'lineChart', startDate: period.start, endDate: period.end }
  const isLineChart = metric.viewType === 'lineChart';
  const isProgress = metric.viewType === 'progress';
  const isTable = metric.viewType === 'table';
  const isPieChart = metric.viewType === 'pieChart';

  const clickHandlerTable = (filters) => {
    const activeWidget = {
      widget: metric,
      period: period,
      ...period.toTimestamps(),
      filters,
    }
    props.setActiveWidget(activeWidget);
  }

  const clickHandler = (event, index) => {
    if (event) {
      const payload = event.activePayload[0].payload;
      const timestamp = payload.timestamp;
      const periodTimestamps = metric.metricType === 'timeseries' ?
        getStartAndEndTimestampsByDensity(timestamp, period.start, period.end, params.density) :
        period.toTimestamps();

      const activeWidget = {
        widget: metric,
        period: period,
        ...periodTimestamps,
        timestamp: payload.timestamp,
        index,
      }

      props.setActiveWidget(activeWidget);
    }
  }

  const updateActiveState = (metricId, state) => {
    props.updateActiveState(metricId, state);
  }

  return (
    <div className={stl.wrapper}>
      <div className="flex items-center p-2">
        <div className="font-medium">{metric.name}</div>
        <div className="ml-auto flex items-center">
          {!isTable && !isPieChart && <WidgetIcon className="cursor-pointer mr-6" icon="bell-plus" tooltip="Set Alert" onClick={props.onAlertClick} /> }
          <WidgetIcon className="cursor-pointer mr-6" icon="pencil" tooltip="Edit Metric" onClick={() => props.init(metric)} />
          <WidgetIcon className="cursor-pointer" icon="close" tooltip="Hide Metric" onClick={() => updateActiveState(metric.metricId, false)} />
        </div>
      </div>
      <div className="px-3">
        <Loader loading={ loading } size="small">
          <NoContent
            size="small"
            title={NO_METRIC_DATA}
            show={ data.length === 0 }
          >
            <ResponsiveContainer height={ 240 } width="100%">
              <>
                {isLineChart && (
                  <CustomMetriLineChart
                      data={ data }
                      params={ params }
                      // seriesMap={ seriesMap }
                      colors={ colors }
                      onClick={ clickHandler }
                  />
                )}

                {isPieChart && (
                  <CustomMetricPieChart
                    metric={metric}
                    data={ data[0] }
                    colors={ colors }
                    onClick={ clickHandlerTable }
                  />
                )}

                {isProgress && (
                  <CustomMetricPercentage
                    data={ data[0] }
                    params={ params }
                    colors={ colors }
                    onClick={ clickHandler }
                  />
                )}

                {isTable && (
                  <CustomMetricTable
                    metric={ metric }
                    data={ data[0] }
                    onClick={ clickHandlerTable }
                    isTemplate={isTemplate}
                  />
                )}
              </>
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
    content={tooltip}
  >
    <div className={className} onClick={onClick}>
        <Icon name={icon} size="14" />
    </div>
  </Popup>
)
