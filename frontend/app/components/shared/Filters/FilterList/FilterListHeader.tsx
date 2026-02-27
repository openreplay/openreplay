import { Space, Typography } from 'antd';
import React, { ReactNode } from 'react';

import EventsOrder from 'Shared/Filters/FilterList/EventsOrder';

interface FilterListHeaderProps {
  title: React.ReactNode;
  filterSelection?: ReactNode;
  showEventsOrder?: boolean;
  orderProps?: any;
  onChangeOrder?: (e: any, data: any) => void;
  actions?: ReactNode[];
  extra?: ReactNode;
}

const FilterListHeader = ({
  title,
  filterSelection,
  showEventsOrder = false,
  orderProps = {},
  onChangeOrder,
  actions = [],
  extra,
}: FilterListHeaderProps) => {
  return (
    <div className="flex items-center gap-2">
      <Space>
        <div className="font-medium min-w-11">{title}</div>
        <Typography.Text>{filterSelection}</Typography.Text>
      </Space>
      <div className="ml-auto flex items-center gap-2">
        {extra && <div>{extra}</div>}
        {showEventsOrder && onChangeOrder && (
          <EventsOrder orderProps={orderProps} onChange={onChangeOrder} />
        )}
        {actions.map((action, index) => (
          <div key={index}>{action}</div>
        ))}
      </div>
    </div>
  );
};

export default FilterListHeader;
