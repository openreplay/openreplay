import { Conditions } from 'App/mstore/types/FeatureFlag';
import React from 'react';
import ConditionSet from 'Shared/ConditionSet';
import { Button } from 'UI';
import { nonConditionalFlagFilters } from 'Types/filter/newFilter';

function ConditionalRecordingSettings({
  conditions,
  setConditions,
  setChanged,
}: {
  setChanged: (changed: boolean) => void;
  conditions: Conditions[];
  setConditions: (conditions: Conditions[]) => void;
}) {
  const addConditionSet = () => {
    setChanged(true);
    setConditions([
      ...conditions,
      new Conditions({ name: `Condition Set ${conditions.length + 1}` }, false),
    ]);
  };
  const removeCondition = (index: number) => {
    setChanged(true);
    setConditions(conditions.filter((_, i) => i !== index))
  }

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
      <div className={'mt-2 flex flex-col gap-4'}>
        {conditions.map((condition, index) => (
          <>
            <ConditionSet
              key={index}
              set={index + 1}
              index={index}
              conditions={condition}
              removeCondition={() => removeCondition(index)}
              readonly={false}
              bottomLine1={'Capture'}
              bottomLine2={'of total session rate matching this condition.'}
              setChanged={setChanged}
              excludeFilterKeys={nonConditionalFlagFilters}
              isConditional
            />
            {index !== conditions.length - 1 ? (
              <div className={'text-disabled-text flex justify-center w-full'}>
                <span>OR</span>
              </div>
            ) : null}
          </>
        ))}
      </div>
    </div>
  );
}

export default ConditionalRecordingSettings;
