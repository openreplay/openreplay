import React from 'react'
import cn from 'classnames'
import stl from './alertTypeLabel.css'

function AlertTypeLabel({ filterKey, type = '' }) {
  return (
    <div className={ cn("rounded-full px-2 text-xs mb-2 fit-content uppercase color-gray-darkest", stl.wrapper, { [stl.alert] : filterKey === 'alert', }) }>
      { type }
    </div>
  )
}

export default AlertTypeLabel
