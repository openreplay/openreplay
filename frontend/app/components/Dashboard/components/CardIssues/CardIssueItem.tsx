import React from 'react';
import { Icon } from 'UI';

interface Props {
    issue: any;
}
function CardIssueItem(props: Props) {
    const { issue: { icon = 'info' } } = props;
    return (
        <div className="flex items-center py-2 hover:bg-active-blue cursor-pointer">
            <div className="mr-auto flex items-center">
                <div className="flex items-center justify-center flex-shrink-0 mr-3 relative">            
                    <Icon name={icon} size="24" className="z-10 inset-0" />
                </div>
                <div className="flex-1 overflow-hidden">
                    Dead Click on
                    <span className="color-gray-medium mx-2">some-button</span>
                </div>
            </div>
            <div>230</div>
        </div>
    );
}

export default CardIssueItem;