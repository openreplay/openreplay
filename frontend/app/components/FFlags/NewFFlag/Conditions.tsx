import React from 'react';
import { Icon, Input, Button } from 'UI';
import cn from 'classnames';
import FilterList from 'Shared/Filters/FilterList';
import { nonFlagFilters } from 'Types/filter/newFilter';
import { observer } from 'mobx-react-lite';
import { Conditions } from "App/mstore/types/FeatureFlag";
import FilterSelection from 'Shared/Filters/FilterSelection';
import { toast } from 'react-toastify';

interface Props {
  set: number;
  conditions: Conditions;
  removeCondition: (ind: number) => void;
  index: number
  readonly?: boolean;
}

function RolloutCondition({ set, conditions, removeCondition, index, readonly }: Props) {
  const [forceRender, forceRerender] = React.useState(false);
  const onAddFilter = (filter: Record<string, any> = {}) => {
    if (conditions.filter.filters.findIndex(f => f.key === filter.key) !== -1) {
      return toast.error('Filter already exists')
    }
    conditions.filter.addFilter(filter);
    forceRerender(!forceRender);
  };
  const onUpdateFilter = (filterIndex: number, filter: any) => {
    conditions.filter.updateFilter(filterIndex, filter);
    forceRerender(!forceRender);
  };

  const onChangeEventsOrder = (_: any, { name, value }: any) => {
    conditions.filter.updateKey(name, value);
    forceRerender(!forceRender);
  };

  const onRemoveFilter = (filterIndex: number) => {
    conditions.filter.removeFilter(filterIndex);
    forceRerender(!forceRender);
  };

  const onPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || '0';
    if (value.length > 3) return;
    if (parseInt(value, 10) > 100) return conditions.setRollout(100);
    conditions.setRollout(parseInt(value, 10));
  };

  return (
    <div className={'border bg-white rounded'}>
      <div className={'flex items-center border-b px-4 py-2 gap-2'}>
        <div>Condition</div>
        <div className={'p-2 rounded bg-gray-lightest'}>Set {set}</div>
        {readonly ? null : (
          <div
            className={cn('p-2 px-4 cursor-pointer rounded ml-auto', 'hover:bg-teal-light')}
            onClick={() => removeCondition(index)}
          >
            <Icon name={'trash'} color={'main'} />
          </div>
        )}
      </div>
      <div className={'p-2'}>
        <div className={conditions.filter.filters.length > 0 ? 'p-2 mb-2' : ''}>
          <FilterList
            filter={conditions.filter}
            onUpdateFilter={onUpdateFilter}
            onRemoveFilter={onRemoveFilter}
            onChangeEventsOrder={onChangeEventsOrder}
            hideEventsOrder
            excludeFilterKeys={nonFlagFilters}
            readonly={readonly}
          />
          {readonly && !conditions.filter?.filters?.length ? (
            <div className={'p-2'}>No conditions</div>
          ) : null}
        </div>
        {readonly ? null : (
          <div className={'px-2'}>
          <FilterSelection
            filter={undefined}
            onFilterClick={onAddFilter}
            excludeFilterKeys={nonFlagFilters}
          >
            <Button variant="text-primary" icon="plus">
              Add Condition
            </Button>
          </FilterSelection>
          </div>
        )}
      </div>
      <div className={'px-4 py-2 flex items-center gap-2 border-t'}>
        <span>Rollout to</span>
        {readonly ? (
          <div className={'font-semibold'}>{conditions.rolloutPercentage}%</div>
        ) : (
          <Input
            type="text"
            width={60}
            value={conditions.rolloutPercentage}
            onChange={onPercentChange}
            leadingButton={<div className={'p-2 text-disabled-text'}>%</div>}
          />
        )}

        <span>of sessions</span>
      </div>
    </div>
  );
}

export default observer(RolloutCondition);
