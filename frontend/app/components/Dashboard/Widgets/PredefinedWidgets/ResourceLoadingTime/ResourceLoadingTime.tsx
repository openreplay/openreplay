import React from 'react';
import { NoContent, DropdownPlain } from 'UI';
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

const WIDGET_KEY = 'resourcesLoadingTime';
export const RESOURCE_OPTIONS = [
  { text: 'All', value: 'all', },
  { text: 'JS', value: "SCRIPT", },
  { text: 'CSS', value: "STYLESHEET", },
  { text: 'Fetch', value: "REQUEST", },
  { text: 'Image', value: "IMG", },
  { text: 'Media', value: "MEDIA", },
  { text: 'Other', value: "OTHER", },
];

interface Props {
    data: any
    optionsLoading: any
    fetchOptions: any
    options: any
    metric?: any
}
function ResourceLoadingTime(props: Props) {
    const { data, optionsLoading, metric } = props;
    const gradientDef = Styles.gradientDef();
    const [autoCompleteSelected, setSutoCompleteSelected] = React.useState('');
    const [type, setType] = React.useState('');

    const onSelect = (params) => {
      // const _params = { density: 70 }
      setSutoCompleteSelected(params.value);
      console.log('params', params) // TODO reload the data with new params;
      // this.props.fetchWidget(WIDGET_KEY, dashbaordStore.period, props.platform, { ..._params, url: params.value })
    }

    const writeOption = (e, { name, value }) => {
      // this.setState({ [name]: value })
      setType(value);
      const _params = { density: 70 } // TODO reload the data with new params;
      // this.props.fetchWidget(WIDGET_KEY, this.props.period, this.props.platform, { ..._params, [ name ]: value === 'all' ? null : value  })
    }

    return (
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
        >
          <>
            <div className="flex items-center mb-3">
              <WidgetAutoComplete
                loading={optionsLoading}
                fetchOptions={props.fetchOptions}
                options={props.options}
                onSelect={onSelect}
                placeholder="Search for Page"
              />
              <DropdownPlain
                disabled={!!autoCompleteSelected}
                name="type"
                label="Resource"
                options={ RESOURCE_OPTIONS }
                onChange={ writeOption }
                defaultValue={'all'}
                wrapperStyle={{
                  position: 'absolute',
                  top: '12px',
                  left: '170px',
                }}
              />
              <AvgLabel className="ml-auto" text="Avg" count={Math.round(data.avg)} unit="ms" />
            </div>
            <ResponsiveContainer height={ 200 } width="100%">
              <AreaChart
                  data={ metric.data.chart }
                  margin={ Styles.chartMargins }
                >
                  {gradientDef}
                  <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                  <XAxis {...Styles.xaxis} dataKey="time" interval={(metric.params.density/7)} />
                  <YAxis
                    {...Styles.yaxis}
                    allowDecimals={false}
                    tickFormatter={val => Styles.tickFormatter(val)}
                    label={{ ...Styles.axisLabelLeft, value: "Resource Fetch Time (ms)" }}
                  />
                  <Tooltip {...Styles.tooltip} />
                  <Area
                    name="Avg"
                    unit=" ms"
                    type="monotone"
                    dataKey="avg"
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
})(ResourceLoadingTime)