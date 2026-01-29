import { Segmented, Dropdown, Button } from 'antd';
import React from 'react';
import { mobileScreen } from 'App/utils/isMobile';

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
  const dropdownOptions = segmentItems.map((item) => ({
    key: item.key,
    label: (
      <div className="flex items-center gap-2">
        {item.icon ? <Icon name={item.icon} color="inherit" /> : null}
        <div>{item.label}</div>
      </div>
    ),
    onClick: () => props.onChange(item.key),
  }));

  const onChange = (val) => {
    props.onChange(val);
  };
  return mobileScreen ? (
    <Dropdown
      menu={{
        items: dropdownOptions,
        style: {
          maxHeight: 500,
          overflowY: 'auto',
        },
      }}
    >
      <Button className="flex! items-center! justify-end! gap-2!">
        {segmentItems.find((item) => item.key === props.activeItem)?.label}
        <Icon name="chevron-down" />
      </Button>
    </Dropdown>
  ) : (
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
