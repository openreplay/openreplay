import React from 'react';
import cn from 'classnames';
import { Tooltip } from 'UI';
import stl from './issueListItem.module.css';

const IssueListItem = ({ issue, onClick, icon, user, active }) => {
  return (
    <div
      onClick={() => onClick(issue)}
      className={cn(
        stl.wrapper,
        active ? 'active-bg' : '',
        'flex flex-col justify-between cursor-pointer text-base text-gray-800'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {icon}
          <span>{issue.id}</span>
        </div>
        <div className="flex items-center">
          {user && (
            <Tooltip title={'Assignee ' + user.name}>
              <img src={user.avatarUrls['24x24']} width="24" height="24" />
            </Tooltip>
          )}
        </div>
      </div>
      <div className={stl.title}>{issue.title}</div>
    </div>
  );
};

export default IssueListItem;
