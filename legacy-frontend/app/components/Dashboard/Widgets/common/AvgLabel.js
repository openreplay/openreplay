import React from 'react'
import { numberWithCommas } from 'App/utils';

const AvgLabel = ({ className = '', text, count, unit}) =>
    <div className={className}>
      <span className="text-sm color-gray-medium">{text}</span>
      <span className="text-2xl ml-1 font-medium">
        {count ? numberWithCommas(Math.round(count)) : 0}
      </span>
      {unit && <span className="font-lg ml-1">{unit}</span>}
    </div>

export default AvgLabel
