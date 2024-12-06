import React from "react";
import { observer } from "mobx-react-lite";
import { Tooltip } from "UI";
import { Select } from "antd";

const EventsOrder = observer((props: {
    onChange: (e: any, v: any) => void,
    filter: any,
}) => {
    const {filter, onChange} = props;
    const eventsOrderSupport = filter.eventsOrderSupport;
    const options = [
        {
            name: 'eventsOrder',
            label: 'Then',
            value: 'then',
            disabled: eventsOrderSupport && !eventsOrderSupport.includes('then'),
        },
        {
            name: 'eventsOrder',
            label: 'And',
            value: 'and',
            disabled: eventsOrderSupport && !eventsOrderSupport.includes('and'),
        },
        {
            name: 'eventsOrder',
            label: 'Or',
            value: 'or',
            disabled: eventsOrderSupport && !eventsOrderSupport.includes('or'),
        },
    ];

    return <div className="flex items-center gap-2">
        <div
            className="color-gray-medium text-sm"
            style={{textDecoration: "underline dotted"}}
        >
            <Tooltip
                title={`Select the operator to be applied between events in your search.`}
            >
                <div>Events Order</div>
            </Tooltip>
        </div>

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
        <div className="text-neutral-500/90 text-sm">Events Order</div>
      </Tooltip>

      <Dropdown overlay={menu} trigger={['click']} placement="bottomRight" className="bg-white border border-neutral-200 rounded-lg px-1 py-0.5 hover:border-teal">
      <a onClick={(e) => e.preventDefault()} className="text-sm items-center gap-2 hover:text-teal">
        <Space className="text-sm">
        {options.find((item) => item.value === filter.eventsOrder)?.label || 'Select'} 
        </Space>
      </a>

      </Dropdown>
    </div>
  );
    </div>;
});
        
        //<Select
          //  size={"small"}
            //className="text-sm"
          //  onChange={(v) => onChange(null, options.find((i) => i.value === v))}
          //  value={filter.eventsOrder}
          //  options={options}
        ///>

export default EventsOrder;
