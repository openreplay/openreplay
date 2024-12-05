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

        <Select
            size={"small"}
            className="text-sm"
            onChange={(v) => onChange(null, options.find((i) => i.value === v))}
            value={filter.eventsOrder}
            options={options}
        />
    </div>;
});

export default EventsOrder;
