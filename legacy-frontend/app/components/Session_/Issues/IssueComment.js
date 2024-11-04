import React from 'react';
import { checkRecentTime } from 'App/date';
import AuthorAvatar from './AuthoAvatar';
import ContentRender from './ContentRender';

const IssueComment = ({ activity, provider }) => {
  return (
    <div className="mb-4 flex">
      <AuthorAvatar
        className="flex-shrink-0 mr-4"
        imgUrl={ activity.user && activity.user.avatarUrls['24x24'] }
        width={24}
        height={24}
      />
      <div className="flex flex-col flex-1 mb-2">
        <div className="flex">
          <span className="font-medium mr-3">{ activity.user && activity.user.name }</span>
          <span className="text-sm ">{ activity.createdAt && checkRecentTime(activity.createdAt) }</span>
        </div>
        <div>{ <ContentRender message={ activity.message } provider={provider} /> }</div>
      </div>
    </div>
  );
};

export default IssueComment;
