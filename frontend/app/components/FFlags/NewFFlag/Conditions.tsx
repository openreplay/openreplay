import React from 'react'
import { Icon, Input, Button } from "UI";
import cn from 'classnames';

const stringOperators = ['is', 'isNot', 'contains', 'doesNotContain']
const presenceOperators = ['isPresent', 'isNotPresent']
const simpleConditions = ['country', 'state', 'city', 'browser', 'os', 'osVersion', 'userDevice', 'referrer']
const conditionsMap = [
  {
    name: 'userId',
    operators: presenceOperators,
  },
  {
    name: 'metadata',
    multiOperators: [{
      operators: ['contains', 'doesNotContain'],
      value: 'keys',
    }, {
      value: 'values',
      operators: ['value'],
      subOperators: stringOperators,
    }]
  }
]
simpleConditions.forEach(condition => {
  conditionsMap.push({
    name: condition,
      operators: [...stringOperators, ...presenceOperators],
  })
})

function RolloutCondition({ set }) {
  const [rolloutPercent, setPercent] = React.useState('100');

  const onPercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length > 3) return;
    if (parseInt(value, 10) > 100) return setPercent("100")
    setPercent(e.target.value);
  }
  return (
    <div className={"border bg-white rounded"}>
      <div className={'flex items-center border-b px-4 py-2 gap-2'}>
        <div>Condition</div>
        <div className={"p-2 rounded bg-gray-lightest"}>Set {set}</div>
        <div className={
          cn(
            "p-2 cursor-pointer rounded ml-auto",
            set === 1 ? "cursor-not-allowed" : "hover:bg-teal-light"
          )
        }>
          <Icon name={"trash"} color={set === 1 ? "" : "main"} />
        </div>
      </div>
      <div className={"p-2 border-b"}>
        <div className={"p-2 border-b mb-2"}>conditions buttons</div>
        <Button variant={"text-primary"}>+ Add Condition</Button>
      </div>
      <div className={"px-4 py-2 flex items-center gap-2"}>
        <span>Rollout to</span>
        <Input
          type="text"
          width={60}
          value={rolloutPercent}
          onChange={onPercentChange}
          leadingButton={<div className={'p-2 text-disabled-text'}>%</div>}
        />
        <span>of users</span>
      </div>
    </div>
  )
}

export default RolloutCondition;