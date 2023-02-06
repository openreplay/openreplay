import React from 'react'
import Step from './EventStep';
import { Step as IStep } from '../../types';

function StepRenderer(props: { steps: IStep[]; isDefault: boolean }) {
  const stepAmount = props.steps.length;
  const shouldSkip = stepAmount > 2;
  if (props.isDefault && shouldSkip) {
    return (
      <div className="flex flex-col gap-4 opacity-50">
        <Step step={props.steps[0]} ind={1} isDefault />
        <div className="ml-4"> + {stepAmount - 2} Steps</div>
        <Step step={props.steps[stepAmount - 1]} ind={stepAmount} isDefault />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {props.steps.map((step, ind) => (
        <React.Fragment key={step.key}>
          <Step step={step} ind={ind} />
        </React.Fragment>
      ))}
    </div>
  );
}

export default StepRenderer
