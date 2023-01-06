import React from 'react'
import stl from './Bar.module.css'

const Bar = ({ className = '', width = 0, avg, domain, color }) => {
  return (
    <div className={className}>
      <div className="flex items-center">
        <div className={stl.bar} style={{ width: `${width < 5 ? 5 : width }%`, backgroundColor: color }}></div>
        <div className="ml-2 shrink-0">
          <span className="font-medium">{avg}</span>
          <span> ms</span>
        </div>
      </div>
      <div className="text-sm leading-3">{domain}</div>
    </div>
  )
}

export default Bar