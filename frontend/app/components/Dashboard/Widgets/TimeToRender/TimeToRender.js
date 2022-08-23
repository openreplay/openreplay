import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles, AvgLabel } from '../common';
import { withRequest } from 'HOCs';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area, Tooltip } from 'recharts';
import WidgetAutoComplete from 'Shared/WidgetAutoComplete';
import { toUnderscore } from 'App/utils';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';

const WIDGET_KEY = 'timeToRender';
const customParams = rangeName => {
  const params = { density: 70 }

  if (rangeName === LAST_24_HOURS) params.density = 70
  if (rangeName === LAST_30_MINUTES) params.density = 70
  if (rangeName === YESTERDAY) params.density = 70
  if (rangeName === LAST_7_DAYS) params.density = 70
  
  return params
}

@withRequest({
	dataName: "options",
  initialData: [],
  dataWrapper: data => data,  
  loadingName: "optionsLoading",
	requestName: "fetchOptions",
	endpoint: '/dashboard/' + toUnderscore(WIDGET_KEY) + '/search',
	method: 'GET'
})
@widgetHOC(WIDGET_KEY, { customParams })
export default class TimeToRender extends React.PureComponent {
  onSelect = (params) => {
    const _params = customParams(this.props.period.rangeName)
    this.props.fetchWidget(WIDGET_KEY, this.props.period, this.props.platform, { ..._params, url: params.value }, this.props.filters)
  }

  render() {
    const { data, loading, optionsLoading, period, compare = false, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const params = customParams(period.rangeName)
    const gradientDef = Styles.gradientDef();

    return (
      <React.Fragment>
        <div className="flex items-center mb-3">
          <WidgetAutoComplete
            loading={optionsLoading}
            fetchOptions={this.props.fetchOptions}
            options={this.props.options}
            onSelect={this.onSelect}
            placeholder="Search for Page"
          />
          <div className="ml-auto">
            <AvgLabel text="Avg." count={Math.round(data.avg)} unit="ms" />
          </div>
        </div>
        <Loader loading={ loading } size="small">
          <NoContent
            size="small"
            show={ data.chart.length === 0 }
            title="No recordings found"
          >
            <ResponsiveContainer height={ 200 } width="100%">
              <AreaChart
                data={ data.chart }
                margin={Styles.chartMargins}
                syncId={ showSync ? WIDGET_KEY : undefined }
              >
                {gradientDef}
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis {...Styles.xaxis} interval={params.density/7} dataKey="time" />
                <YAxis
                  {...Styles.yaxis}
                  label={{ ...Styles.axisLabelLeft, value: "Time to Render (ms)" }}
                  tickFormatter={val => Styles.tickFormatter(val)}
                />
                <Tooltip {...Styles.tooltip} />
                <Area
                  name="Avg"
                  unit=" ms"
                  type="monotone"
                  dataKey="avg"
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
      </React.Fragment>
    );
  }
}
