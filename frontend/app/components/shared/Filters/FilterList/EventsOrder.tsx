import React from 'react';
import { observer } from 'mobx-react-lite';
import { Dropdown, Button, Tooltip } from 'antd';

const EventsOrder = observer(
  (props: { onChange: (e: any, v: any) => void; filter: any }) => {
    const { filter, onChange } = props;
    const { eventsOrderSupport } = filter;

    const menuItems = [
      {
        key: 'then',
        label: 'THEN',
        disabled: eventsOrderSupport && !eventsOrderSupport.includes('then'),
      },
      {
        key: 'and',
        label: 'AND',
        disabled: eventsOrderSupport && !eventsOrderSupport.includes('and'),
      },
      {
        key: 'or',
        label: 'OR',
        disabled: eventsOrderSupport && !eventsOrderSupport.includes('or'),
      },
    ];
    const onClick = ({ key }: any) => {
      onChange(null, { name: 'eventsOrder', value: key, key });
    };

    const selected = menuItems.find(
      (item) => item.key === filter.eventsOrder,
    )?.label;
    return (
      <div className="flex items-center gap-2">
        <Tooltip
          title="Select the operator to be applied between events."
          placement="bottom"
        >
          <div className="text-neutral-500/90 text-sm font-normal cursor-default">Events Order</div>
        </Tooltip>

        <Dropdown
          menu={{ items: menuItems, onClick }}
          trigger={['click']}
          placement="bottomRight"
          className="text-sm rounded-lg px-1 py-0.5 btn-events-order "
          data-event="btn-events-order"
        >
          <Button size="small" type="text">
            {selected || 'Select'}
            {' '}
          </Button>
        </Dropdown>
      </div>
    );
  },
);

export default EventsOrder;
