import React from 'react'
import stl from './Bar.css'

const Bar = ({ className = '', width = 0, avg, domain, color }) => {
  return (
    <div className={className}>
      <div className="flex items-center">
        <div className={stl.bar} style={{ width: `${width}%`, backgroundColor: color }}></div>
        <div className="ml-2">{avg}</div>
      </div>
      <div className="text-sm leading-none">{domain}</div>
    </div>
  )
}

export default Bar
