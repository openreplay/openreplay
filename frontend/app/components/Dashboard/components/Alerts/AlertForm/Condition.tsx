import React from 'react';
import { Input } from 'UI';
import Select from 'Shared/Select';
import { alertConditions as conditions } from 'App/constants';

const thresholdOptions = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: '1 day', value: 1440 },
];

const changeOptions = [
  { label: 'change', value: 'change' },
  { label: '% change', value: 'percent' },
];

interface ICondition {
  isThreshold: boolean;
  writeOption: (e: any, data: any) => void;
  instance: Alert;
  triggerOptions: any[];
  writeQuery: (data: any) => void;
  writeQueryOption: (e: any, data: any) => void;
  unit: any;
}

function Condition({
  isThreshold,
  writeOption,
  instance,
  triggerOptions,
  writeQueryOption,
  writeQuery,
  unit,
}: ICondition) {
  return (
    <div>
      {!isThreshold && (
        <div className="flex items-center my-3">
          <label className="w-1/6 flex-shrink-0 font-normal">{'Trigger when'}</label>
          <Select
            className="w-2/6"
            placeholder="change"
            options={changeOptions}
            name="change"
            defaultValue={instance.change}
            onChange={({ value }) => writeOption(null, { name: 'change', value })}
            id="change-dropdown"
          />
        </div>
      )}

      <div className="flex items-center my-3">
        <label className="w-1/6 flex-shrink-0 font-normal">
          {isThreshold ? 'Trigger when' : 'of'}
        </label>
        <Select
          className="w-2/6"
          placeholder="Select Metric"
          isSearchable={true}
          options={triggerOptions}
          name="left"
          value={triggerOptions.find((i) => i.value === instance.query.left)}
          onChange={({ value }) => writeQueryOption(null, { name: 'left', value: value.value })}
        />
      </div>

      <div className="flex items-center my-3">
        <label className="w-1/6 flex-shrink-0 font-normal">{'is'}</label>
        <div className="w-2/6 flex items-center">
          <Select
            placeholder="Select Condition"
            options={conditions}
            name="operator"
            value={conditions.find(c => c.value === instance.query.operator)}
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
              <span className="ml-2">{'test'}</span>
            </>
          )}
          {!unit && (
            <Input
              wrapperClassName="ml-2"
              name="right"
              value={instance.query.right}
              onChange={writeQuery}
              placeholder="Specify Value"
            />
          )}
        </div>
      </div>

      <div className="flex items-center my-3">
        <label className="w-1/6 flex-shrink-0 font-normal">{'over the past'}</label>
        <Select
          className="w-2/6"
          placeholder="Select timeframe"
          options={thresholdOptions}
          name="currentPeriod"
          defaultValue={instance.currentPeriod}
          onChange={({ value }) => writeOption(null, { name: 'currentPeriod', value })}
        />
      </div>
      {!isThreshold && (
        <div className="flex items-center my-3">
          <label className="w-1/6 flex-shrink-0 font-normal">{'compared to previous'}</label>
          <Select
            className="w-2/6"
            placeholder="Select timeframe"
            options={thresholdOptions}
            name="previousPeriod"
            defaultValue={instance.previousPeriod}
            onChange={({ value }) => writeOption(null, { name: 'previousPeriod', value })}
          />
        </div>
      )}
    </div>
  );
}

export default Condition;
