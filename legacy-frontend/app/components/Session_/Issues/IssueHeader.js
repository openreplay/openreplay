import React from 'react';
import { Icon } from 'UI';

const GotoSessionLink = props => (
  <a className="flex items-center absolute right-0 mr-3 cursor-pointer">
    {'Go to session'}
    <Icon name="next1" size="16" />
  </a> 
)

const IssueHeader = ({issue, typeIcon, assignee}) => {
  return (
    <div className="relative p-6 bg-white">
      {/* <GotoSessionLink /> */}
      {/* <ActiveIssueClose /> */}
      <div className="flex leading-none mb-2 items-center">
        { typeIcon }
        {/* <img className="mr-2" src={typeIcon} alt="" width={16} height={16} /> */}
        <span className="mr-2 font-medium">{ issue.id }</span>
        {/* <div className="text-gray-700 text-sm">{ '@ 00:13 Secs'}</div> */}
        { assignee && 
          <div>
            <span className="text-gray-600 mr-2">{'Assigned to'}</span>
            <span className="font-medium" key={ assignee.id }>{ assignee.name }</span>   
          </div>
        }
      </div>
      <h2 className="text-xl font-medium mb-2 truncate">{issue.title}</h2>
    </div>
  );
};

export default IssueHeader;
