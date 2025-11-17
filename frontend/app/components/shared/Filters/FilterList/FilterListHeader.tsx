import React, { ReactNode } from 'react';
import { Space, Typography } from 'antd';
import EventsOrder from 'Shared/Filters/FilterList/EventsOrder';

interface FilterListHeaderProps {
  title: string;
  filterSelection?: ReactNode;
  showEventsOrder?: boolean;
  orderProps?: any;
  onChangeOrder?: (e: any, data: any) => void;
  actions?: ReactNode[];
}

const FilterListHeader = ({
  title,
  filterSelection,
  showEventsOrder = false,
  orderProps = {},
  onChangeOrder,
  actions = [],
}: FilterListHeaderProps) => {
  return (
    <div className="flex items-center gap-2">
      <Space>
        <div className="font-medium w-11">{title}</div>
        <Typography.Text>{filterSelection}</Typography.Text>
      </Space>
      <div className="ml-auto flex items-center gap-2">
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
