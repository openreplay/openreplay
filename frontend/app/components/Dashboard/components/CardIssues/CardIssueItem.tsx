import React from 'react';
import { Icon } from 'UI';
import Issue from 'App/mstore/types/issue';

interface Props {
  issue: Issue;
}

function CardIssueItem(props: Props) {
  const { issue } = props;
  return (
    <div className='flex items-center py-2 hover:bg-active-blue cursor-pointer'>
      <div className='mr-auto flex items-center'>
        <div className='flex items-center justify-center flex-shrink-0 mr-3 relative'>
          <Icon name={issue.icon} size='24' className='z-10 inset-0' style={{fill: issue.color }}/>
        </div>
        <div className='flex-1 overflow-hidden'>
          {issue.name}
          <span className='color-gray-medium mx-2'>{issue.source}</span>
        </div>
      </div>
      <div>{issue.sessionCount}</div>
    </div>
  );
}

export default CardIssueItem;