import React from 'react';
import { Tooltip } from 'UI';

const MIN_WIDTH = '20px';
interface Props {
  issue: any;
}
function FunnelIssueGraph(props: Props) {
  const { issue } = props;

  return (
    <div className="flex rounded-sm" style={{ width: '600px' }}>
      <div
        style={{ width: issue.unaffectedSessionsPer + '%', minWidth: MIN_WIDTH }}
        className="relative"
      >
        <Tooltip title={`Unaffected sessions`} placement="top">
          <div
            className="w-full relative rounded-tl-sm rounded-bl-sm"
            style={{ height: '18px', backgroundColor: 'rgba(217, 219, 238, 0.7)' }}
          />
          <div className="absolute ml-2 font-bold top-0 bottom-0 text-sm">
            {issue.unaffectedSessions}
          </div>
        </Tooltip>
      </div>
      <div
        style={{ width: issue.affectedSessionsPer + '%', minWidth: MIN_WIDTH }}
        className="border-l relative"
      >
        <Tooltip title={`Affected sessions`} placement="top">
          <div
            className="w-full relative"
            style={{ height: '18px', backgroundColor: 'rgba(238, 238, 238, 0.7)' }}
          />
          <div className="absolute ml-2 font-bold top-0 bottom-0 text-sm">
            {issue.affectedSessions}
          </div>
        </Tooltip>
      </div>
      <div
        style={{ width: issue.lostConversionsPer + '%', minWidth: MIN_WIDTH }}
        className="border-l relative"
      >
        <Tooltip title={`Conversion lost`} placement="top">
          <div
            className="w-full relative rounded-tr-sm rounded-br-sm"
            style={{ height: '18px', backgroundColor: 'rgba(204, 0, 0, 0.26)' }}
          />
          <div className="absolute ml-2 font-bold top-0 bottom-0 text-sm color-red">
            {issue.lostConversions}
          </div>
        </Tooltip>
      </div>
    </div>
  );
}

export default FunnelIssueGraph;
