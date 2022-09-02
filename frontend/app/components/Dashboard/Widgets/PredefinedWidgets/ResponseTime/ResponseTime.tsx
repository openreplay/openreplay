import React from 'react';
import { NoContent } from 'UI';
import { Styles, AvgLabel } from '../../common';
import { withRequest } from 'HOCs'
import { 
    AreaChart, Area,
    CartesianGrid, Tooltip,
    ResponsiveContainer, 
    XAxis, YAxis
  } from 'recharts';import { toUnderscore } from 'App/utils';
import { NO_METRIC_DATA } from 'App/constants/messages'

const WIDGET_KEY = 'pagesResponseTime';

interface Props {
    data: any
    optionsLoading: any
    fetchOptions: any
    options: any
    metric?: any
}
function ResponseTime(props: Props) {
    const { data, metric } = props;
    const gradientDef = Styles.gradientDef();

    return (
        <NoContent
          size="small"
          title={NO_METRIC_DATA}
          show={ metric.data.chart.length === 0 }
        >
          <>
            <div className="flex items-center mb-3">
              {/* <WidgetAutoComplete
                loading={optionsLoading}
                fetchOptions={props.fetchOptions}
                options={props.options}
                onSelect={onSelect}
                placeholder="Search for Page"
              /> */}
              <AvgLabel className="ml-auto" text="Avg" count={Math.round(metric.data.value)} unit="ms" />
            </div>
            <ResponsiveContainer height={ 207 } width="100%">
              <AreaChart
                  data={ data.chart }
                  margin={ Styles.chartMargins }
                >
                  {gradientDef}
                  <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                  <XAxis {...Styles.xaxis} dataKey="time" interval={(metric.params.density/7)} />
                  <YAxis
                    {...Styles.yaxis}
                    allowDecimals={false}
                    tickFormatter={val => Styles.tickFormatter(val)}
                    label={{ ...Styles.axisLabelLeft, value: "Page Response Time (ms)" }}
                  />
                  <Tooltip {...Styles.tooltip} />
                  <Area
                    name="Avg"
                    type="monotone"
                    unit=" ms"
                    dataKey="value"
                    stroke={Styles.strokeColor}
                    fillOpacity={ 1 }
                    strokeWidth={ 2 }
                    strokeOpacity={ 0.8 }
                    fill={'url(#colorCount)'}
                  />
                </AreaChart>
            </ResponsiveContainer>
          </>
        </NoContent>
    );
}

export default withRequest({
	dataName: "options",
  initialData: [],
  dataWrapper: data => data,  
  loadingName: 'optionsLoading',
	requestName: "fetchOptions",
	endpoint: '/dashboard/' + toUnderscore(WIDGET_KEY) + '/search',
	method: 'GET'
})(ResponseTime)
