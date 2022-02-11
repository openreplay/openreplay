import React from 'react';
import { Styles, CountBadge } from '../common';
import { CloseButton, Loader } from 'UI';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Area, Tooltip } from 'recharts';
import { numberWithCommas } from 'App/utils';
import cn from 'classnames';
import stl from './trendChart.css';

const loadChart = (data, loading, unit, syncId, compare, tooltipLael) => {
  const gradientDef = Styles.gradientDef();
  return (
    <div className="-m-4 z-0">
      <Loader loading={ loading } size="small" className="pt-10">
        <ResponsiveContainer height={ 130 } width="100%">
          <AreaChart
            data={ data }
            syncId={syncId}
            margin={ {
              top: 85, right: 0, left: 0, bottom: 5,
            } }
          >
            {gradientDef}
            <Tooltip {...Styles.tooltip} />
            <XAxis hide {...Styles.xaxis} interval={4} dataKey="time" />
            <YAxis hide interval={ 0 } />
            <Area
              name={tooltipLael}
              // unit={unit && ' ' + unit}
              type="monotone"
              dataKey="value"
              stroke={compare? Styles.compareColors[0] : Styles.colors[0]}
              fillOpacity={ 1 }
              strokeWidth={ 2 }
              strokeOpacity={ 0.8 }
              fill={compare ? 'url(#colorCountCompare)' : 'url(#colorCount)'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Loader>
    </div>
  )
}

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

function TrendChart({ 
  loading = true, 
  title,
  avg,
  progress,
  unit = false,
  subtext,
  data,
  handleRemove,
  compare = false,
  comparing = false,
  syncId = '',
  tooltipLael = '',
  textClass ='',
  prefix = '',
  canRemove = true
}) {
  return (
    <div className="group border rounded p-4 relative bg-white" style={{ height: '130px'}}>
      { canRemove && (
        <CloseButton
          className="absolute right-0 top-0 m-4 z-10 invisible group-hover:visible"
          onClick={ handleRemove } size="17"
        />
      )}
      <div className="absolute flex items-start flex-col justify-center inset-0 p-3">
        <div className="mb-2 flex items-center" >
          {comparing && <div className={cn(stl.circle, { 'bg-tealx' : !compare, 'bg-teal' : compare})} />}
          <div className={ cn("text-lg") }>{ title }</div>
        </div>
        <div className="flex items-center">
          {prefix}
          {/* <div className="h-2 w-2 bg-red mr-2" /> */}
          {/* <div className="h-2 w-2 bg-green mr-2 rounded-full" /> */}
          {/* <div className="mr-2" style={{ borderWidth: "0 5px 7px 5px", borderColor: "transparent transparent #007bff transparent" }} /> */}
          <CountBadge
            title={subtext}
            count={ countView(avg, unit) }
            change={ progress || 0 }
            unit={ unit }
            className={textClass}
          />
        </div>
      </div>
      { loadChart(data, loading, unit, syncId, compare, tooltipLael) }
    </div>
  )
}

export default TrendChart
