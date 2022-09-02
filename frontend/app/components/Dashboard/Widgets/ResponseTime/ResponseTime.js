import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, domain, Styles, AvgLabel } from '../common';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area, Tooltip } from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';
import WidgetAutoComplete from 'Shared/WidgetAutoComplete';
import { withRequest } from 'HOCs';
import { toUnderscore } from 'App/utils';

const WIDGET_KEY = 'pagesResponseTime';

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
  // resetBeforeRequest: true,
  loadingName: "optionsLoading",
	requestName: "fetchOptions",
	endpoint: '/dashboard/' + toUnderscore(WIDGET_KEY) + '/search',
	method: 'GET'
})
@widgetHOC(WIDGET_KEY, { customParams })
export default class ResponseTime extends React.PureComponent {
  onSelect = (params) => {
    const _params = customParams(this.props.period.rangeName)
    this.props.fetchWidget(WIDGET_KEY, this.props.period, this.props.platform, {..._params, url: params.value }, this.props.filters)
  }

  render() {
    const { data, loading, optionsLoading, compare = false, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const gradientDef = Styles.gradientDef();

    return (
      <React.Fragment>
        <div className="flex items-center justify-between mb-3">
          <WidgetAutoComplete
            loading={optionsLoading}
            fetchOptions={this.props.fetchOptions}
            options={this.props.options}
            onSelect={this.onSelect}
            placeholder="Search for Page"
          />
          <div className="flex items-center justify-end mb-3">
            <AvgLabel text="Avg" unit="ms" className="ml-3" count={data.avg} />
          </div>
        </div>
        <Loader loading={ loading } size="small">
          <NoContent
            size="small"
            show={ data.chart.size === 0 }
            title="No recordings found"
          >
            <ResponsiveContainer height={ 207 } width="100%">
              <AreaChart
                data={ data.chart }
                margin={Styles.chartMargins}
                syncId={ showSync ? "pagesResponseTime" : undefined }
              >
                {gradientDef}
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis {...Styles.xaxis} interval={10} dataKey="time" />
                <YAxis
                  {...Styles.yaxis}
                  // tickFormatter={(val) => `${val}` }
                  label={{ ...Styles.axisLabelLeft, value: "Page Response Time (ms)" }}
                />
                <Tooltip {...Styles.tooltip} />
                <Area
                  name="Avg"
                  type="monotone"
                  unit=" ms"
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
