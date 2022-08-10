import React from 'react';
import { Popup } from 'UI';

const MIN_WIDTH = '20px';
interface Props {
    issue: any
}
function FunnelIssueGraph(props: Props) {
    const { issue } = props;

    return (
        <div className="flex rounded-sm" style={{ width: '600px' }}>
            <div style={{ width: issue.unaffectedSessionsPer + '%', minWidth: MIN_WIDTH }} className="relative">
                <Popup
                    content={ `Unaffected sessions` }
                    size="tiny"
                    inverted
                    position="top center"
                >
                    <div className="w-full relative rounded-tl-sm rounded-bl-sm" style={{ height: '18px', backgroundColor: 'rgba(217, 219, 238, 0.7)' }} />
                    <div className="absolute ml-2 font-bold top-0 bottom-0 text-sm">{issue.unaffectedSessions}</div>               
                </Popup>
            </div>
            <div style={{ width: issue.affectedSessionsPer + '%', minWidth: MIN_WIDTH}} className="border-l relative">
                <Popup
                    content={ `Affected sessions` }
                    size="tiny"
                    inverted
                    position="top center"
                >        
                    <div className="w-full relative" style={{ height: '18px', backgroundColor: 'rgba(238, 238, 238, 0.7)' }} />
                    <div className="absolute ml-2 font-bold top-0 bottom-0 text-sm">{issue.affectedSessions}</div>
                </Popup>
            </div>
            <div style={{ width: issue.lostConversionsPer + '%', minWidth: MIN_WIDTH}} className="border-l relative">
                <Popup
                    content={ `Conversion lost` }
                    size="tiny"
                    inverted
                    position="top center"
                >
                    <div className="w-full relative rounded-tr-sm rounded-br-sm" style={{ height: '18px', backgroundColor: 'rgba(204, 0, 0, 0.26)' }} />
                    <div className="absolute ml-2 font-bold top-0 bottom-0 text-sm color-red">{issue.lostConversions}</div>            
                </Popup>
            </div>
        </div>
    );
}

export default FunnelIssueGraph;