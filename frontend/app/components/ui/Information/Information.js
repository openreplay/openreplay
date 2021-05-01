import React from 'react'
import stl from './information.css'
import cn from 'classnames'

function Information({ primary = true, content = '' }) {
  return (
    <div className={cn(stl.wrapper, { [stl.primary]: primary })}>
      { content }
    </div>
  )
}

export default Information
