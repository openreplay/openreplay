import { CloseOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { Icon } from 'UI';

interface Props {
  removeSelectedValue: (value: string) => void;
}
function FunnelIssuesSelectedFilters(props: Props) {
  const { funnelStore } = useStore();
  const issuesFilter = funnelStore.issuesFilter;
  const { removeSelectedValue } = props;

  return (
    <div className="flex items-center flex-wrap">
      {issuesFilter.map((option, index) => (
        <Tag
          variant="filled"
          key={index}
          closable
          onClose={() => removeSelectedValue(option.value)}
          className="select-none rounded-lg text-base gap-1 bg-indigo-lightest flex items-center"
        >
          {option.label}
        </Tag>
      ))}
    </div>
  );
}

export default observer(FunnelIssuesSelectedFilters);
