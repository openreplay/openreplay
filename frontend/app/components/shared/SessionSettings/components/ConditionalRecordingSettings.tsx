import { Button } from '@/ui/actions/button';
import { Plus } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Conditions } from 'App/mstore/types/FeatureFlag';

import ConditionSet from 'Shared/ConditionSet';

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
    <div className="flex flex-col gap-4">
      {conditions.map((condition, index) => (
        <React.Fragment key={`${index}_${condition.name}`}>
          {index > 0 ? <span className="m-condset__or">{t('or')}</span> : null}
          <ConditionSet
            set={index + 1}
            index={index}
            conditions={condition}
            removeCondition={() => removeCondition(index)}
            readonly={false}
            bottomLine1={t('Capture')}
            bottomLine2={t('of total session rate matching this condition.')}
            setChanged={setChanged}
            isMobile={isMobile}
          />
        </React.Fragment>
      ))}
      <span>
        <Button onClick={addConditionSet}>
          <Plus size={13} />
          {t('Add condition set')}
        </Button>
      </span>
    </div>
  );
}

export default ConditionalRecordingSettings;
