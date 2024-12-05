import React from "react";
import { observer } from "mobx-react-lite";
import { Dropdown, Menu, Tooltip, Space } from "antd";
import {DownOutlined} from '@ant-design/icons';

const EventsOrder = observer((props: {
  onChange: (e: any, v: any) => void,
  filter: any,
}) => {
  const { filter, onChange } = props;
  const eventsOrderSupport = filter.eventsOrderSupport;

  const options = [
    {
      name: 'eventsOrder',
      label: 'THEN',
      value: 'then',
      disabled: eventsOrderSupport && !eventsOrderSupport.includes('then'),
    },
    {
      name: 'eventsOrder',
      label: 'AND',
      value: 'and',
      disabled: eventsOrderSupport && !eventsOrderSupport.includes('and'),
    },
    {
      name: 'eventsOrder',
      label: 'OR',
      value: 'or',
      disabled: eventsOrderSupport && !eventsOrderSupport.includes('or'),
    },
  ];

  const menu = (
    <Menu
      onClick={(e) => {
        const selectedOption = options.find((item) => item.value === e.key);
        if (selectedOption && !selectedOption.disabled) {
          onChange(null, selectedOption);
        }
      }}
    >
      {options.map((item) => (
        <Menu.Item key={item.value} disabled={item.disabled}>
          {item.label}
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div className="flex items-center gap-2">
      <Tooltip title="Select the operator to be applied between events." placement="bottom">
        <div className="color-gray-medium text-sm">Events Order</div>
      </Tooltip>

      <Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
      <a onClick={(e) => e.preventDefault()} className="text-sm items-center gap-2 hover:text-teal">
        <Space className="text-sm">
        {options.find((item) => item.value === filter.eventsOrder)?.label || 'Select'} 
        <DownOutlined className="mr-2 text-xs" />
        </Space>
      </a>

      </Dropdown>
    </div>
  );
});

export default EventsOrder;