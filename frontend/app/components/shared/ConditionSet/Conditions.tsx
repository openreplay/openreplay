import React from 'react';
import { observer } from 'mobx-react-lite';
import { Conditions } from 'App/mstore/types/FeatureFlag';
import { toast } from 'react-toastify';
import ConditionSetComponent from './ConditionSet';

interface Props {
  set: number;
  conditions: Conditions;
  removeCondition: (ind: number) => void;
  index: number;
  readonly?: boolean;
  bottomLine1: string;
  bottomLine2: string;
  setChanged?: (changed: boolean) => void;
  excludeFilterKeys?: string[];
  isConditional?: boolean;
}

function ConditionSet({
  set,
  conditions,
  removeCondition,
  index,
  readonly,
  bottomLine1,
  bottomLine2,
  setChanged,
  excludeFilterKeys,
  isConditional,
}: Props) {
  const [forceRender, forceRerender] = React.useState(false);

  const onAddFilter = (filter: Record<string, any> = {}) => {
    setChanged?.(true);
    if (conditions.filter.filters.findIndex((f) => f.key === filter.key) !== -1) {
      return toast.error('Filter already exists');
    }
    conditions.filter.addFilter(filter);
    forceRerender(!forceRender);
  };
  const onUpdateFilter = (filterIndex: number, filter: any) => {
    setChanged?.(true);
    conditions.filter.updateFilter(filterIndex, filter);
    forceRerender(!forceRender);
  };

  const onChangeEventsOrder = (_: any, { name, value }: any) => {
    setChanged?.(true)
    conditions.filter.updateKey(name, value);
    forceRerender(!forceRender);
  };

  const onRemoveFilter = (filterIndex: number) => {
    setChanged?.(true)
    conditions.filter.removeFilter(filterIndex);
    forceRerender(!forceRender);
  };

  const onPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChanged?.(true)
    const value = e.target.value || '0';
    if (value.length > 3) return;
    if (parseInt(value, 10) > 100) return conditions.setRollout(100);
    conditions.setRollout(parseInt(value, 10));
  };

  const changeName = (name: string) => {
    setChanged?.(true);
    conditions.name = name;
  };

  return (
    <ConditionSetComponent
      set={set}
      changeName={changeName}
      removeCondition={removeCondition}
      index={index}
      readonly={readonly}
      onAddFilter={onAddFilter}
      bottomLine1={bottomLine1}
      bottomLine2={bottomLine2}
      onPercentChange={onPercentChange}
      excludeFilterKeys={excludeFilterKeys}
      conditions={conditions}
      onUpdateFilter={onUpdateFilter}
      onRemoveFilter={onRemoveFilter}
      onChangeEventsOrder={onChangeEventsOrder}
      isConditional={isConditional}
    />
  );
}

export default observer(ConditionSet);
