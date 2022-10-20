import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import SectionTitle from './SectionTitle';
import { Step as IStep } from '../types';

const STEP_NAMES = { CLICKRAGE: 'Multiple click', CLICK: 'Clicked', LOCATION: 'Visited' };

function Steps() {
  const { bugReportStore } = useStore();

  return (
    <div>
      <SectionTitle>Steps to reproduce</SectionTitle>

      <div className="mb-2 text-gray-medium">STEPS</div>

      <div className="flex flex-col gap-4">
        {bugReportStore.sessionEventSteps.map((step, ind) => (
          <React.Fragment key={step.key}>
            <Step step={step} ind={ind} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function Step({ step, ind }: { step: IStep; ind: number }) {
  return (
    <div className="py-1 px-2 flex items-center gap-2 w-full rounded hover:bg-figmaColors-secondary-outlined-hover-background">
      <div className="rounded-3xl px-4 bg-gray-lightest">{ind + 1}</div>
      <div className="flex items-center gap-1">
        <div>{step.icon}</div>
        {/* @ts-ignore */}
        <div className="font-semibold">{STEP_NAMES[step.type]}</div>
        <div className="text-gray-medium">{step.details}</div>
      </div>
    </div>
  );
}

export default observer(Steps);
