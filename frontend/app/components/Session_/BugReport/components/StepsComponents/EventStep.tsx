import React from 'react';
import { Icon } from 'UI';
import { Step as IStep } from '../../types';
const STEP_NAMES = { CLICKRAGE: 'Multiple click', CLICK: 'Clicked', LOCATION: 'Visited' };
import { useStore } from 'App/mstore';
import cn from 'classnames';
import { Duration } from 'luxon';

function Step({ step, ind, isDefault }: { step: IStep; ind: number; isDefault?: boolean }) {
  const { bugReportStore } = useStore();
  return (
    <div
      className={cn(
        'py-1 px-2 flex items-center gap-2 w-full rounded',
        isDefault ? '' : 'hover:bg-figmaColors-secondary-outlined-hover-background group'
      )}
    >
      <div className="rounded-3xl px-4 bg-gray-lightest">{ind + 1}</div>
      <div className="flex items-center gap-2">
        {/* @ts-ignore */}
        <Icon name={step.icon} size={16} color="gray-darkest" />
        <div className="px-2 text-disabled-text rounded bg-light-blue-bg">{Duration.fromMillis(step.time).toFormat('hh:mm:ss')}</div>
        {/* @ts-ignore */}
        <div className="font-semibold">{STEP_NAMES[step.type]}</div>
        <div className="text-gray-medium">{step.details}</div>
      </div>
      <div className="hidden group-hover:flex items-center ml-auto gap-4">
        <Icon name="plus" size={16} className="cursor-pointer hover:fill-gray-darkest" />
        <div onClick={() => bugReportStore.removeStep(step)}>
          <Icon name="trash" size={16} className="cursor-pointer hover:fill-gray-darkest" />
        </div>
      </div>
    </div>
  );
}

export default Step;
