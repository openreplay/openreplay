import React from 'react';
import cn from 'classnames';
import { Popup } from 'UI';
import stl from './issueListItem.css';

const IssueListItem = ({ issue, onClick, icon, user, active }) => {
  return (
    <div
      onClick={ () => onClick(issue) }
      className={ cn(stl.wrapper, active ? 'active-bg' : '', 'flex flex-col justify-between cursor-pointer text-base text-gray-800')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          { icon }
          {/* <img src={ icon } width="16" height="16" className="mr-3" /> */}
          <span>{ issue.id }</span>
        </div>
        <div className="flex items-center">
          { user && 
            <Popup
              trigger={ 
                <img src={ user.avatarUrls['24x24'] } width="24" height="24" />
              }
              content={ 'Assignee ' + user.name }
              size="small"
              position="top right"
              inverted
            />
          }
        </div>
      </div>
      <div className={ stl.title }>{ issue.title  }</div>
    </div>
  );
};

export default IssueListItem;
