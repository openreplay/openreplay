import React from 'react';
import { NoContent } from 'UI';
import { Styles, AvgLabel } from '../../common';
import { withRequest } from 'HOCs'
import { 
    AreaChart, Area,
    BarChart, Bar, CartesianGrid, Tooltip,
    LineChart, Line, Legend, ResponsiveContainer, 
    XAxis, YAxis
  } from 'recharts';
import WidgetAutoComplete from 'Shared/WidgetAutoComplete';
import { toUnderscore } from 'App/utils';

const WIDGET_KEY = 'pagesDomBuildtime';

interface Props {
    data: any
    optionsLoading: any
    fetchOptions: any
    options: any
    metric?: any
}
function DomBuildingTime(props: Props) {
    const { data, optionsLoading, metric } = props;
    const gradientDef = Styles.gradientDef();

    const onSelect = (params) => {
      // const _params = { density: 70 }
      // TODO reload the data with new params;
      // this.props.fetchWidget(WIDGET_KEY, dashbaordStore.period, props.platform, { ..._params, url: params.value })
    }

    return (
        <NoContent
          size="small"
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
              <AvgLabel className="ml-auto" text="Avg" count={Math.round(metric.data.avg)} unit="ms" />
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
                    label={{ ...Styles.axisLabelLeft, value: "DOM Build Time (ms)" }}
                  />
                  <Tooltip {...Styles.tooltip} />
                  <Area
                    name="Avg"
                    type="monotone"
                    // unit="%"
                    dataKey="value"
                    stroke={Styles.colors[0]}
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
})(DomBuildingTime)