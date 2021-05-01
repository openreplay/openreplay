import React from 'react'
import stl from './sessionStack.css'
import cn from 'classnames';
import { Icon } from 'UI'
import { names } from 'Types/watchdog'
import { applySavedFilter, setActiveFlow } from 'Duck/filters';
import { connect } from 'react-redux';
import { setActiveTab } from 'Duck/sessions';

const IconLabel = ({ icon, label}) => (
  <div className="w-9/12 flex items-center justify-end">
    <Icon name={icon} size="20" color={label > 0 ? 'gray' : 'gray-medium'} />
    <div className={cn('ml-2 text-xl', label > 0 ? 'color-gray' : 'color-gray-medium')}>{label}</div>
  </div>
)

function SessionStack({ flow = {}, applySavedFilter, setActiveTab, setActiveFlow }) {
  const onAllClick = (flow) => {
    setActiveFlow(flow)
    applySavedFilter(flow.filter)
    setActiveTab({ type: 'all', name: 'All'})
  }
  return (
    <div className={stl.wrapper}>
      <div
        className="text-xl mb-6 capitalize color-teal cursor-pointer"
        onClick={() => onAllClick(flow)}>
        {flow.name}
      </div>
      <div className="flex items-center">
        <div className="w-2/12 text-xl"><span className="text-3xl">{flow.count}</span> Sessions</div>
        <div className="w-6/12 flex items-center ml-auto">
          {flow.watchdogs.map(({type, count}) => (
            <IconLabel key={type} icon={names[type].icon} label={count} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default connect(null, { applySavedFilter, setActiveTab, setActiveFlow })(SessionStack)
