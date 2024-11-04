import React from 'react'
import stl from './Bar.module.css'
// import { Styles } from '../common'
import { TextEllipsis } from 'UI';

const Bar = ({ className = '', versions = [], width = 0, avg, domain, colors }) => {
  return (
    <div className={className}>
      <div className="flex items-center">
        <div className={stl.bar} style={{ width: `${width < 15 ? 15 : width }%`}}>
          {versions.map((v, i) => {
            const w = (v.value * 100)/ avg;
            return ( 
            <div key={i} className="text-xs" style={{ width: `${w }%`, backgroundColor: colors[i]}}>
              <TextEllipsis text={v.key} hintText={
                <div className="text-sm">
                  <div>Version: {v.key}</div>
                  <div>Sessions: {v.value}</div>
                </div>
              } />
            </div> 
            )
          })}
        </div>
        <div className="ml-2">
          <span className="font-medium">{`${avg}`}</span>
        </div>
      </div>
      <div className="text-sm">{domain}</div>
    </div>
  )
}

export default Bar