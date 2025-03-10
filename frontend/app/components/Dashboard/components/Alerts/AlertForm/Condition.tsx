import React, { useMemo } from 'react';
import { Input } from 'UI';
import Select from 'Shared/Select';
import { alertConditions as conditions } from 'App/constants';
import Alert from 'Types/alert';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const thresholdOptions = (t: TFunction) => [
  { label: t('15 minutes'), value: 15 },
  { label: t('30 minutes'), value: 30 },
  { label: t('1 hour'), value: 60 },
  { label: t('2 hours'), value: 120 },
  { label: t('4 hours'), value: 240 },
  { label: t('1 day'), value: 1440 },
];

const changeOptions = (t: TFunction) => [
  { label: t('change'), value: 'change' },
  { label: t('% change'), value: 'percent' },
];

interface ICondition {
  isThreshold: boolean;
  writeOption: (e: any, data: any) => void;
  instance: Alert;
  triggerOptions: any[];
  writeQuery: (data: any) => void;
  writeQueryOption: (e: any, data: any) => void;
  unit: any;
  changeUnit: (value: string) => void;
}

function Condition({
  isThreshold,
  writeOption,
  instance,
  triggerOptions,
  writeQueryOption,
  writeQuery,
  unit,
  changeUnit,
}: ICondition) {
  const { t, i18n } = useTranslation();

  const localizedConditions = useMemo(() => conditions.map((c) => ({
    ...c,
    label: t(c.label),
  })), [i18n.language]);

  return (
    <div>
      {!isThreshold && (
        <div className="flex items-center my-3">
          <label className="w-1/6 flex-shrink-0 font-normal">
            {t('Trigger when')}
          </label>
          <Select
            className="w-2/6"
            placeholder="change"
            options={changeOptions(t)}
            name="change"
            defaultValue={instance.change}
            onChange={({ value }) => changeUnit(value)}
            id="change-dropdown"
          />
        </div>
      )}

      <div className="flex itemsx-center my-3">
        <label className="w-1/6 flex-shrink-0 font-normal">
          {isThreshold ? t('Trigger when') : t('of')}
        </label>
        <Select
          className="w-2/6"
          placeholder={t('Select Metric')}
          isSearchable
          options={triggerOptions}
          name="left"
          value={
            triggerOptions.find((i) => i.value === instance.query.left) || ''
          }
          onChange={({ value }) =>
            writeQueryOption(null, { name: 'left', value: value.value })
          }
        />
      </div>

      <div className="flex items-center my-3">
        <label className="w-1/6 flex-shrink-0 font-normal">{t('is')}</label>
        <div className="w-2/6 flex items-center">
          <Select
            placeholder={t('Select Condition')}
            options={localizedConditions}
            name="operator"
            value={
              localizedConditions.find((c) => c.value === instance.query.operator) || ''
            }
            onChange={({ value }) =>
              writeQueryOption(null, { name: 'operator', value: value.value })
            }
          />
          {unit && (
            <>
              <Input
                className="px-4"
                style={{ marginRight: '31px' }}
                name="right"
                value={instance.query.right}
                onChange={writeQuery}
                placeholder="E.g. 3"
              />
              <span className="ml-2">{t('test')}</span>
            </>
          )}
          {!unit && (
            <Input
              wrapperClassName="ml-2"
              name="right"
              value={instance.query.right}
              onChange={writeQuery}
              placeholder={t('Specify Value')}
              type="number"
            />
          )}
        </div>
      </div>

      <div className="flex items-center my-3">
        <label className="w-1/6 flex-shrink-0 font-normal">
          {t('over the past')}
        </label>
        <Select
          className="w-2/6"
          placeholder={t('Select timeframe')}
          options={thresholdOptions(t)}
          name="currentPeriod"
          defaultValue={instance.currentPeriod}
          onChange={({ value }) =>
            writeOption(null, { name: 'currentPeriod', value })
          }
        />
      </div>
      {!isThreshold && (
        <div className="flex items-center my-3">
          <label className="w-1/6 flex-shrink-0 font-normal">
            {t('compared to previous')}
          </label>
          <Select
            className="w-2/6"
            placeholder={t('Select timeframe')}
            options={thresholdOptions(t)}
            name="previousPeriod"
            defaultValue={instance.previousPeriod}
            onChange={({ value }) =>
              writeOption(null, { name: 'previousPeriod', value })
            }
          />
        </div>
      )}
    </div>
  );
}

export default Condition;
