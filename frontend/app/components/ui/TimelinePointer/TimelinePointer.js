import React from 'react'
import { Icon, Popup } from 'UI'
import stl from './timelinePointer.css'
import cn from 'classnames'

function TimelinePointer({ icon, content }) {
  return (
    <Popup
      offset={-20}
      pinned
      trigger={
        <div className={cn(stl.wrapper, 'flex items-center justify-center relative')}>          
          <div className={stl.pin} />
          <div style={{ top: '3px' }} className={stl.icon} >
            <Icon name={icon} size="18" style={{ fill: '#D3545F' }} />
          </div>
        </div>
      }
      content={content}
    />    
  )
}

export default TimelinePointer
