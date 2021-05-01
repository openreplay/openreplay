import React from 'react'
import { Icon } from 'UI'
import { numberWithCommas } from 'App/utils'

const style = { content: "\f10d", fontSize: "100px", color: "rgba(0,0,0,0.1)" };
function FunnelOverview({ funnel }) {
  return (
    <div className="p-4 py-5 bg-white border rounded flex flex-col justify-center" style={{ background: '#FFFEF9' }}>
      <div className="uppercase flex items-center mb-4">
        <Icon name="lightbulb-on" className="mr-2" size="24" />
        <div className="text-lg font-bold color-gray-medium">Insights</div>
      </div>
      <div className="leading-6 relative">        
        <div className="text-xl">
          <span className="">{numberWithCommas(funnel.affectedUsers)} users</span> who had this experience show a conversion impact of <span className="color-gray-darkest color-red">{funnel.conversionImpact}%</span> between <span className="font-bold color-gray-darkest">{funnel.firstStage}</span> and <span className="font-bold color-gray-darkest">{funnel.lastStage}</span> leading to an estimated <span className="color-gray-darkest color-red">{numberWithCommas(funnel.totalDropDueToIssues)}</span> lost conversions.
        </div>
      </div>
    </div>    
  )
}

export default FunnelOverview
