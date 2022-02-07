import React from 'react'
import cn from 'classnames'
import AddWidgets from '../AddWidgets';

function WidgetSection({ className, title, children, description, type, widgets = [] }) {
  return (
    <div className={cn(className, 'rounded p-4 bg-gray-light-shade')}>
      <div className="mb-4 flex items-center">
        <div className="flex items-center">
          <div className="text-2xl mr-3">{title}</div>
          <AddWidgets type={type} widgets={widgets} />
        </div>
        {description && <div className="ml-auto color-gray-darkest font-medium text-sm">{description}</div> }
      </div>
      { children }
    </div>
  )
}

export default WidgetSection
