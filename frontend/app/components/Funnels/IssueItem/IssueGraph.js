import React from 'react'
import { Popup } from 'UI'

function IssueGraph({ issue }) {
  return (
    <div className="flex rounded-sm" style={{ width: '600px' }}>            
      <Popup content={ `Unaffected sessions` } >
          <div style={{ width: issue.unaffectedSessionsPer + '%' }} className="relative">        
            <div className="w-full relative rounded-tl-sm rounded-bl-sm" style={{ height: '18px', backgroundColor: 'rgba(217, 219, 238, 0.7)' }} />
            <div className="absolute ml-2 font-bold top-0 bottom-0 text-sm">{issue.unaffectedSessions}</div>            
          </div>
      </Popup>
      <Popup content={ `Affected sessions` } >
          <div style={{ width: issue.affectedSessionsPer + '%'}} className="border-l relative">
            <div className="w-full relative" style={{ height: '18px', backgroundColor: 'rgba(238, 238, 238, 0.7)' }} />
            <div className="absolute ml-2 font-bold top-0 bottom-0 text-sm">{issue.affectedSessions}</div>
            {/* <div className="absolute left-0 ml-1 text-xs">{issue.affectedSessionsPer}</div> */}
          </div>
      </Popup>
      <Popup content={ `Conversion lost` } >
          <div style={{ width: issue.lostConversionsPer + '%'}} className="border-l relative">
            <div className="w-full relative rounded-tr-sm rounded-br-sm" style={{ height: '18px', backgroundColor: 'rgba(204, 0, 0, 0.26)' }} />
            <div className="absolute ml-2 font-bold top-0 bottom-0 text-sm color-red">{issue.lostConversions}</div>            
          </div>
      </Popup>
    </div>
  )
}

export default IssueGraph
