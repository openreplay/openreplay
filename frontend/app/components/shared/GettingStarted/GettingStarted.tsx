import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import StepList, { Step } from './StepList';

interface Props {
  list: Step[];
}

function GettingStarted(props: Props) {
  const { list } = props;
  const pendingSteps = list.filter((step) => step.status === 'pending');
  const completedSteps = list.filter(
    (step) => step.status === 'completed' || step.status === 'ignored'
  );

  return (
    <div className="bg-white p-4">
      <div>
        <div>Setup Openreplay</div>
        <p>Find all the ways in which OpenReplay can benefit you and your product.</p>
      </div>

      <StepList title="Pending" steps={pendingSteps} status="pending" />
      <StepList title="Completed" steps={completedSteps} status="completed" />
    </div>
  );
}

export default GettingStarted;
