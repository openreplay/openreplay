import React from 'react'
import FilterOperator from '../FilterOperator';
import FilterValue from '../FilterValue';

interface Props {
    filterIndex: number;
    filter: any; // event/filter
    onUpdate: (filter: any) => void;
    onRemoveFilter: () => void;
    isFilter?: boolean;
}
export default function SubFilterItem(props: Props) {
    const { isFilter = false, filterIndex, filter } = props;
    const canShowValues = !(filter.operator === "isAny" || filter.operator === "onAny" || filter.operator === "isUndefined");

    const onOperatorChange = (e, { name, value }) => {
        props.onUpdate({ ...filter, operator: value })
    }

    return (
        <div className="flex items-center hover:bg-active-blue pb-4">
            <div className="flex-shrink-0 py-1">{filter.label}</div>
            <FilterOperator
              options={filter.operatorOptions}
              onChange={onOperatorChange}
              className="mx-2 flex-shrink-0"
              value={filter.operator}
            />

            { canShowValues && (<FilterValue filter={filter} onUpdate={props.onUpdate} />) }
        </div>
    )
}
