import React from 'react'
import { Styles } from '../../common';
import { AreaChart, ResponsiveContainer, XAxis, YAxis, Area, Tooltip } from 'recharts';
import CountBadge from '../../common/CountBadge';
import { numberWithCommas } from 'App/utils';

interface Props {
    data: any;
}
function CustomMetricOverviewChart(props: Props) {
    const { data } = props;
    const gradientDef = Styles.gradientDef();
    
    return (
        <div className="relative -mx-4">
            <div className="absolute flex items-start flex-col justify-start inset-0 p-3">
                <div className="mb-2 flex items-center" >
                </div>
                <div className="flex items-center">
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
                    margin={ {
                        top: 50, right: 0, left: 0, bottom: 0,
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
                        stroke={Styles.strokeColor}
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


const countView = (avg: any, unit: any) => {  
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