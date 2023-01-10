import React from 'react';
import cn from 'classnames';
import { Icon, TextEllipsis } from 'UI';
import FunnelIssueGraph from '../FunnelIssueGraph';

interface Props {
    issue: any;
    inDetails?: boolean;
    onClick?: () => void;
}
function FunnelIssuesListItem(props: Props) {
    const { issue, inDetails = false, onClick } = props;
    // const { showModal } = useModal();
    // const onClick = () => {
    //     showModal(<FunnelIssueModal issueId={issue.issueId} />, { right: true });
    // }
    return (
        <div className={cn('flex flex-col bg-white w-full rounded border relative hover:bg-active-blue', { 'cursor-pointer bg-hover' : !inDetails })} onClick={!inDetails ? onClick : () => null}>
            {/* {inDetails && (
                <BackLink onClick={onBack} className="absolute" style={{ left: '-50px', top: '8px' }} />
            )} */}
            <div className="flex items-center px-6 py-4 relative">        
                <div className="mr-3">
                <div
                    className="flex items-center justify-center flex-shrink-0 mr-3 relative"
                >            
                    <Icon name={issue.icon.icon} style={{ fill: issue.icon.color }} size="24" className="z-10 inset-0" />
                </div>
                </div>
                
                {inDetails && (
                    <div className="flex-1 overflow-hidden">
                        <div className="text-lg font-medium mb-2 capitalize">{issue.title}</div>
                        <div className="text-xl whitespace-nowrap">              
                        <TextEllipsis text={issue.contextString} />
                        </div>
                    </div>
                )}

                {!inDetails && (
                    <div className="flex-1 overflow-hidden">
                        <div className="text-xl mb-2 capitalize">{issue.title}</div>
                        <div className="text-sm color-gray-medium whitespace-nowrap leading-none">
                        <TextEllipsis text={issue.contextString} />
                        </div>
                    </div>
                )}
                
                <div className="text-center text-sm ml-10 flex-shrink-0">
                    <div className="text-xl mb-2">{issue.affectedUsers}</div>
                    <div className="color-gray-medium leading-none">Affected Users</div>
                </div>

                <div className="text-center text-sm ml-10 flex-shrink-0">
                    <div className="text-xl mb-2 color-red">{issue.conversionImpact}<span className="text-sm ml-1">%</span></div>
                    <div className="color-gray-medium leading-none">Conversion Impact</div>
                </div>

                <div className="text-center text-sm ml-10 flex-shrink-0">
                    <div className="text-xl mb-2">{issue.lostConversions}</div>
                    <div className="color-gray-medium leading-none">Lost Conversions</div>
                </div>      
            </div>
            {inDetails && (
                <div className="flex items-center px-6 py-4 justify-between border-t">
                    <FunnelIssueGraph issue={issue} />
                    <div className="flex items-center">
                        <Info label="Unaffected sessions" color="rgba(217, 219, 238, 0.7)" />
                        <Info label="Affected sessions" color="rgba(238, 238, 238, 0.7)" />
                        <Info label="Conversion Lost" color="rgba(204, 0, 0, 0.26)" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default FunnelIssuesListItem;

const Info = ({ label = '', color = 'red'}) => {
    return (
      <div className="flex items-center ml-4">
        <div className="flex text-sm items-center color-gray-medium">
          <div className={ cn("w-2 h-2 rounded-full mr-2") } style={{ backgroundColor: color }} />
          <div>{ label }</div>
        </div>
      </div>
    )
  }