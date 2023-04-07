import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';

export interface Step {
  title: string;
  status: 'pending' | 'ignored' | 'completed';
  description: string;
  icon: string;
}

interface StepListProps {
  title: string;
  steps: Step[];
  status: 'pending' | 'completed';
}

const StepList = React.memo((props: StepListProps) => {
  const { title, steps, status } = props;
  const isCompleted = status === 'completed';

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="my-3">
      <div className="text-lg font-medium mb-2">
        {title} {steps.length}
      </div>
      {steps.map((step) => {
        switch (step.status) {
          case 'pending':
            return (
              <div
                key={step.title}
                className={cn('border rounded p-3 mb-4 flex items-start', {
                  'hover:bg-active-blue': !isCompleted,
                })}
              >
                <div className="w-10 mt-1 shrink-0">
                  <Icon name="check-circle" size={20} />
                </div>
                <div>
                  <div className="font-medium text-lg link">{step.title}</div>
                  <div>{step.description}</div>
                  <div className="flex gap-6 mt-3">
                    <a className="link">Docs</a>
                    {!isCompleted && <a className="link">Ignore</a>}
                  </div>
                </div>
              </div>
            );
          case 'completed':
          case 'ignored':
            return (
              <div
                key={step.title}
                className="border rounded p-3 mb-4 flex items-start bg-gray-lightest"
              >
                <div className="w-10 mt-1 shrink-0">
                  <Icon name="check-circle-fill" size={20} color="blue" />
                </div>
                <div>
                  <div className="font-medium text-lg">{step.title}</div>
                  <div>{step.description}</div>
                  <div className="flex gap-6 mt-3">
                    <a className="link">Docs</a>
                  </div>
                </div>
              </div>
            );
        }
      })}
    </div>
  );
});

export default StepList;