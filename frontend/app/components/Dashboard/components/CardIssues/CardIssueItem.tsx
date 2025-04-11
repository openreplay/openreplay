import React from 'react';
import { Icon } from 'UI';
import Issue from 'App/mstore/types/issue';
import { List } from 'antd';

interface Props {
  issue: Issue;
}

function CardIssueItem(props: Props) {
  const { issue } = props;
  return (
    <>
      <List.Item.Meta
        title={issue.name}
        description={<div className="text-nowrap truncate">{issue.source}</div>}
        avatar={<Icon name={issue.icon} size="24" />}
        className="cursor-pointer hover:bg-indigo-50"
      />
      <div>{issue.sessionCount}</div>
    </>
  );
}

export default CardIssueItem;
