import { Conditions } from 'App/mstore/types/FeatureFlag';
import React from 'react';
import ConditionSet from 'Shared/ConditionSet';
import { Icon } from 'UI';
import { Button } from 'antd';
import { nonConditionalFlagFilters } from 'Types/filter/newFilter';
import { useTranslation } from 'react-i18next';

function ConditionalRecordingSettings({
  conditions,
  setConditions,
  setChanged,
  isMobile,
}: {
  setChanged: (changed: boolean) => void;
  conditions: Conditions[];
  setConditions: (conditions: Conditions[]) => void;
  isMobile?: boolean;
}) {
  const { t } = useTranslation();
  const addConditionSet = () => {
    setChanged(true);
    setConditions([
      ...conditions,
      new Conditions(
        { name: `${t('Condition Set')} ${conditions.length + 1}` },
        false,
      ),
    ]);
  };
  const removeCondition = (index: number) => {
    setChanged(true);
    setConditions(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="relative py-1 px-5">
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
      <div className="flex gap-1 items-center">
        <span className="font-semibold">{t('matching')}</span>
        <Button
          type="text"
          icon={<Icon name="plus" size={16} />}
          onClick={addConditionSet}
        >
          {t('Condition Set')}
        </Button>
      </div>
      <div className="mt-2 flex flex-col gap-4">
        {conditions.map((condition, index) => (
          <React.Fragment key={`${index}_${condition.name}`}>
            <ConditionSet
              key={index}
              set={index + 1}
              index={index}
              conditions={condition}
              removeCondition={() => removeCondition(index)}
              readonly={false}
              bottomLine1={t('Capture')}
              bottomLine2={t('of total session rate matching this condition.')}
              setChanged={setChanged}
              excludeFilterKeys={nonConditionalFlagFilters}
              isConditional
              isMobile={isMobile}
            />
            {index !== conditions.length - 1 ? (
              <div className="text-disabled-text flex justify-center w-full">
                <span>{t('OR')}</span>
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default ConditionalRecordingSettings;
