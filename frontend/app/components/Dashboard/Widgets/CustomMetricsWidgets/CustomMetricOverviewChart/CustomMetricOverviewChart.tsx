import React from 'react'
import { Styles } from '../../common';
import { AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, Tooltip } from 'recharts';
import { LineChart, Line, Legend } from 'recharts';
import cn from 'classnames';
import CountBadge from '../../common/CountBadge';
import { numberWithCommas } from 'App/utils';

interface Props {
    data: any;
    params: any;
    seriesMap: any;
    colors: any;
    onClick?: (event, index) => void;
}
function CustomMetricOverviewChart(props: Props) {
    const { data, params, seriesMap, colors, onClick = () => null } = props;
    console.log('data', data)
    const gradientDef = Styles.gradientDef();
    return (
        <div className='relative'>
            <div className="absolute flex items-start flex-col justify-center inset-0 p-3">
                <div className="mb-2 flex items-center" >
                {/* <div className={ cn("text-lg") }>{ 'test' }</div> */}
                </div>
                <div className="flex items-center">
                {/* {prefix} */}
                {/* <div className="h-2 w-2 bg-red mr-2" />
                <div className="h-2 w-2 bg-green mr-2 rounded-full" />
                <div className="mr-2" style={{ borderWidth: "0 5px 7px 5px", borderColor: "transparent transparent #007bff transparent" }} /> */}
                <CountBadge
                    // title={subtext}
                    count={ countView(Math.round(data.value), data.unit) }
                    change={ data.progress || 0 }
                    unit={ data.unit }
                    // className={textClass}
                />
                </div>
            </div>
            <ResponsiveContainer height={ 100 } width="100%">
                <AreaChart
                    data={ data.chart }
                    // syncId={syncId}
                    margin={ {
                        top: 85, right: 0, left: 0, bottom: 5,
                    } }
                >
                    {gradientDef}
                    <Tooltip {...Styles.tooltip} />
                    <XAxis hide {...Styles.xaxis} interval={4} dataKey="time" />
                    <YAxis hide interval={ 0 } />
                    <Area
                        name={''}
                        // unit={unit && ' ' + unit}
                        type="monotone"
                        dataKey="value"
                        stroke={Styles.colors[0]}
                        fillOpacity={ 1 }
                        strokeWidth={ 2 }
                        strokeOpacity={ 0.8 }
                        fill={'url(#colorCount)'}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

export default CustomMetricOverviewChart


const countView = (avg, unit) => {  
    if (unit === 'mb') {
      if (!avg) return 0;
      const count = Math.trunc(avg / 1024 / 1024);
      return numberWithCommas(count);
    }
    if (unit === 'min') {
      if (!avg) return 0;
      const count = Math.trunc(avg);
      return numberWithCommas(count > 1000 ? count +'k' : count);
    }
    return avg ? numberWithCommas(avg): 0;
  }