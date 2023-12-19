import { Conditions } from 'App/mstore/types/FeatureFlag';
import React from 'react';
import ConditionSet from 'Shared/ConditionSet';
import { Button } from 'UI';
import { nonConditionalFlagFilters } from "Types/filter/newFilter";

function ConditionalRecordingSettings({ setChanged }: { setChanged: (changed: boolean) => void }) {
  const [conditions, setConditions] = React.useState<Conditions[]>([]);

  const addConditionSet = () => {
    setChanged(true)
    setConditions([...conditions, new Conditions(undefined, false)]);
  };

  return (
    <div className={'relative py-1 px-5'}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          borderLeft: '1px dashed black',
          borderBottom: '1px dashed black',
          borderBottomLeftRadius: '6px',
          height: '22px',
          width: '14px',
        }}
      />
      <div className={'flex gap-1 items-center'}>
        <span className={'font-semibold'}>matching</span>
        <Button variant={'text-primary'} icon={'plus'} onClick={addConditionSet}>
          Condition Set
        </Button>
      </div>
      <div className={'mt-2'}>
        {conditions.map((condition, index) => (
          <ConditionSet
            key={index}
            set={index + 1}
            index={index}
            conditions={condition}
            removeCondition={() => setConditions(conditions.filter((_, i) => i !== index))}
            readonly={false}
            bottomLine1={'Capture'}
            bottomLine2={'of total session rate matching this condition.'}
            setChanged={setChanged}
            excludeFilterKeys={nonConditionalFlagFilters}
            isConditional
          />
        ))}
      </div>
    </div>
  );
}

export default ConditionalRecordingSettings;
