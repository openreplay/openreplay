import { observer } from 'mobx-react-lite';
import React from 'react';

import { Conditions } from 'App/mstore/types/FeatureFlag';

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
  isMobile?: boolean;
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
  isMobile,
}: Props) {
  const onPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChanged?.(true);
    const value = e.target.value || '0';
    if (value.length > 3) return;
    if (parseInt(value, 10) > 100) return conditions.setRollout(100);
    conditions.setRollout(parseInt(value, 10));
  };

  const changeName = (name: string) => {
    setChanged?.(true);
    conditions.setName(name);
  };

  return (
    <ConditionSetComponent
      set={set}
      changeName={changeName}
      removeCondition={removeCondition}
      index={index}
      readonly={readonly}
      onChanged={() => setChanged?.(true)}
      bottomLine1={bottomLine1}
      bottomLine2={bottomLine2}
      onPercentChange={onPercentChange}
      conditions={conditions}
      isMobile={isMobile}
    />
  );
}

export default observer(ConditionSet);
