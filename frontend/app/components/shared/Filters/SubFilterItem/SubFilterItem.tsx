import React from 'react';
import FilterOperator from '../FilterOperator';
import FilterValue from '../FilterValue';
import { observer } from 'mobx-react-lite';

interface Props {
  filterIndex: number;
  filter: any; // event/filter
  onUpdate: (filter: any) => void;
  onRemoveFilter: () => void;
  isFilter?: boolean;
  isLive?: boolean;
}

function SubFilterItem(props: Props) {
  const filter = props.filter;
  const canShowValues = !(
    filter.operator === 'isAny' ||
    filter.operator === 'onAny' ||
    filter.operator === 'isUndefined'
  );

  const onOperatorChange = (e, { name, value }) => {
    props.onUpdate({ ...filter, operator: value });
  };

  return (
    <div className="flex items-center hover:bg-active-blue">
      <div className="flex-shrink-0 py-1">{filter.label}</div>
      <FilterOperator
        options={filter.operatorOptions}
        onChange={onOperatorChange}
        className="mx-2 flex-shrink-0 btn-filter-operator"
        value={filter.operator}
      />

      {canShowValues && (
        <FilterValue
          isLive={props.isLive}
          filter={filter}
          onUpdate={props.onUpdate}
        />
      )}
    </div>
  );
}

export default observer(SubFilterItem);
