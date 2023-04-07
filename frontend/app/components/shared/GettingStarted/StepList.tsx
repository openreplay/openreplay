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

const StepItem = React.memo((props: Step) => {
  const { title, description, status } = props;
  const isCompleted = status === 'completed';

  const onIgnore = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
  };

  return (
    <div
      className={cn('border rounded p-3 mb-4 flex items-start', {
        'bg-gray-lightest': isCompleted,
        'hover:bg-active-blue': !isCompleted,
      })}
    >
      <div className="w-10 mt-1 shrink-0">
        <Icon name={isCompleted ? 'check-circle-fill' : 'check-circle'} size={20} color={isCompleted ? 'teal' : 'gray-dark'}/>
      </div>
      <div>
        <div className={cn('font-medium', { link: !isCompleted })}>{title}</div>
        <div className="text-sm">{description}</div>
        <div className="flex gap-6 mt-3">
          <a
            className="link"
            href="https://docs.openreplay.com/en/installation/setup-or/"
            target="_blank"
          >
            Docs
          </a>
          {!isCompleted && (
            <a className="link" onClick={onIgnore}>
              Ignore
            </a>
          )}
        </div>
      </div>
    </div>
  );
});

const StepList = React.memo((props: StepListProps) => {
  const { title, steps, status } = props;

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="my-3">
      <div className="text-lg font-medium mb-2">
        {title} {steps.length}
      </div>
      {steps.map((step) => (
        <StepItem key={step.title} {...step} status={status} />
      ))}
    </div>
  );
});

export default StepList;
