import React from 'react'
import cn from 'classnames'

const ResourceType = ({ data : { type = 'js' }, compare }) => {
  return (
    <div className={ cn("rounded-full p-2 color-white h-12 w-12 flex items-center justify-center", { 'bg-teal': compare, 'bg-tealx': !compare})}>
      <span className="overflow-hidden whitespace-no-wrap text-xs">{ type.toUpperCase() }</span>
    </div>
  )
}

export default ResourceType
