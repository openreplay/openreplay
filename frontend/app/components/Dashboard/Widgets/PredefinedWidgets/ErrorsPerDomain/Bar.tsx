import React from 'react'
import stl from './bar.module.css'

const Bar = ({ className = '', width = 0, avg, domain, color }) => {
  return (
    <div className={className}>
      <div className="flex items-center">
        <div className={stl.bar} style={{ width: `${width > 0 ? width : 5 }%`, backgroundColor: color }}></div>
        <div className="ml-2">
          <span className="font-medium">{`${avg}`}</span>
        </div>
      </div>
      <div className="text-sm leading-3 color-gray-medium">{domain}</div>
    </div>
  )
}

export default Bar