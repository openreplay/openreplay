import {observer} from "mobx-react-lite";
import {Tooltip} from "UI";
import {Segmented} from "antd";
import React from "react";

const EventsOrder = observer((props: {
    onChange: (e: any, v: any) => void,
    filter: any,
}) => {
    const {filter, onChange} = props;
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

        <Segmented
            size={"small"}
            className="text-sm"
            onChange={(v) => onChange(null, options.find((i) => i.value === v))}
            value={filter.eventsOrder}
            options={options}
        />
    </div>;
});

export default EventsOrder;
