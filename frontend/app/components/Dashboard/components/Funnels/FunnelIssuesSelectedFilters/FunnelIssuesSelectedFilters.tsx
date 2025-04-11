import React from 'react';
import { Icon } from 'UI';
import { Tag } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

interface Props {
  removeSelectedValue: (value: string) => void;
}
function FunnelIssuesSelectedFilters(props: Props) {
  const { funnelStore } = useStore();
  const issuesFilter = useObserver(() => funnelStore.issuesFilter);
  const { removeSelectedValue } = props;

  return (
    <div className="flex items-center flex-wrap">
      {issuesFilter.map((option, index) => (
        <Tag
          bordered={false}
          key={index}
          closable
          onClose={() => removeSelectedValue(option.value)}
          className="select-none rounded-lg text-base gap-1 bg-indigo-50 flex items-center"
        >
          {option.label}
        </Tag>
      ))}
    </div>
  );
}

export default FunnelIssuesSelectedFilters;
