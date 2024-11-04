import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import { Step } from 'App/mstore/types/gettingStarted';
import { useStore } from 'App/mstore';
import { onboarding as onboardingRoute, withSiteId } from 'App/routes';
import { RouteComponentProps, withRouter } from 'react-router';
import { connect } from 'react-redux';
import { useModal } from 'App/components/Modal';

interface StepListProps extends RouteComponentProps {
  title: string;
  steps: Step[];
  status: 'pending' | 'completed';
  docsLink?: string;
  siteId: string;
}

const StepItem = React.memo(
  ({
    step,
    onClick,
    onIgnore,
  }: {
    step: Step;
    onIgnore: (e: React.MouseEvent<HTMLAnchorElement>, step: any) => void;
    onClick: () => void;
  }) => {
    const { title, description, status, docsLink } = step;
    const isCompleted = status === 'completed';

    return (
      <div
        className={cn('border rounded p-3 mb-4 flex items-start', {
          'bg-gray-lightest': isCompleted,
          'hover:bg-active-blue': !isCompleted,
        })}
      >
        <div className="w-10 mt-1 shrink-0">
          <Icon
            name={isCompleted ? 'check-circle-fill' : 'check-circle'}
            size={20}
            color={isCompleted ? 'teal' : 'gray-dark'}
          />
        </div>
        <div>
          <div className={cn('font-medium', { link: !isCompleted })} onClick={!isCompleted ? onClick : () => {}}>{title}</div>
          <div className="text-sm">{description}</div>
          <div className="flex gap-6 mt-3">
            <a className="link" href={docsLink} target="_blank">
              Docs
            </a>
            {!isCompleted && (
              <a className="link" onClick={(e) => onIgnore(e, step)}>
                Ignore
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
);

const StepList = React.memo((props: StepListProps) => {
  const { title, steps, status } = props;
  const { hideModal } = useModal();

  const {
    settingsStore: { gettingStarted },
  } = useStore();

  const onIgnore = (e: React.MouseEvent<HTMLAnchorElement>, step: any) => {
    e.preventDefault();
    gettingStarted.completeStep(step);
  };

  if (steps.length === 0) {
    return null;
  }

  const onClick = (step: any) => {
    const { siteId, history } = props;
    hideModal();
    history.push(withSiteId(onboardingRoute(step.url), siteId));
  };

  return (
    <div className="my-3">
      <div className="text-lg font-medium mb-2">
        {title} {steps.length}
      </div>
      {steps.map((step) => (
        <StepItem key={step.title} onIgnore={onIgnore} step={step} onClick={() => onClick(step)}/>
      ))}
    </div>
  );
});

export default connect((state: any) => ({
  siteId: state.getIn(['site', 'siteId']),
}))(withRouter(StepList));
