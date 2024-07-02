import React from 'react';
import { Icon, Tooltip } from 'UI';
import { Segmented } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import cn from 'classnames';

interface Props {
  sortOrder: string;
  onChange?: (sortOrder: string) => void;
}
export default React.memo(function SortOrderButton(props: Props) {
  const { sortOrder, onChange = () => null } = props;
  const isAscending = sortOrder === 'asc';

  return (
    <div className="rounded-full">

          <Segmented
            size='small'
            options={[
              { label: 'Ascending', value: 'Ascending', icon: <ArrowUpOutlined /> },
              { label: 'Descending', value: 'Descending', icon: <ArrowDownOutlined /> },
            ]}
            onChange={(value) => {
              if (value === 'Ascending') {
                onChange('asc');
              } else if (value === 'Descending') {
                onChange('desc');
              }
            }}
          />
    </div>
  );
});
