import React from 'react'
import FunnelGraphSmall from '../FunnelGraphSmall'

function FunnelItem({ funnel, onClick = () => null }) {  
  return (
    <div className="w-full flex items-center p-4 bg-white rounded border cursor-pointer" onClick={onClick}>
      <div className="mr-4">
        <FunnelGraphSmall data={funnel.stages} />
      </div>

      <div className="mr-auto">
        <div className="text-xl mb-2">{funnel.name}</div>
        <div className="flex items-center text-sm">
          <div className="mr-3"><span className="font-medium">{funnel.stepsCount}</span> Steps</div>
          <div><span className="font-medium">{funnel.sessionsCount}</span> Sessions</div>
        </div>
      </div>

      <div className="text-center text-sm px-6">
        <div className="text-xl mb-2 color-red">{funnel.criticalIssuesCount}</div>
        <div>Critical Issues</div>
      </div>

      <div className="text-center text-sm px-6">
        <div className="text-xl mb-2">{funnel.missedConversions}%</div>
        <div>Missed Conversions</div>
      </div>
    </div>
  )
}

export default FunnelItem
