import { Segmented } from 'antd';
import cn from 'classnames';
import React from 'react';

import { Icon } from 'UI';

interface Props {
  onChange: any;
  activeItem: string;
  filters: any;
}

const allItem = { key: 'all', title: 'All' };

function IntegrationFilters(props: Props) {
  const segmentItems = [allItem, ...props.filters].map((item: any) => ({
    key: item.key,
    value: item.key,
    label: (
      <div className="flex items-center gap-2">
        {item.icon ? <Icon name={item.icon} color="inherit" /> : null}
        <div>{item.title}</div>
      </div>
    ),
  }));

  const onChange = (val) => {
    props.onChange(val);
  };
  return (
    <div className="flex items-center gap-4">
      <Segmented
        value={props.activeItem}
        onChange={onChange}
        options={segmentItems}
      />
    </div>
  );
}

export default IntegrationFilters;
