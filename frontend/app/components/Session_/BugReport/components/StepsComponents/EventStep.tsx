import React from 'react';
import { Icon, ItemMenu } from 'UI';
import { Step as IStep } from '../../types';
const STEP_NAMES = { CLICKRAGE: 'Multiple click', CLICK: 'Clicked', LOCATION: 'Visited' };
import { useStore } from 'App/mstore';
import cn from 'classnames';
import { Duration } from 'luxon';

function Step({ step, ind, isDefault }: { step: IStep; ind: number; isDefault?: boolean }) {
  const { bugReportStore } = useStore();
  const [menuOpen, setMenu] = React.useState(false);

  const menuItems = [
    { icon: 'quotes', text: 'Add Note', onClick: () => bugReportStore.toggleSubStepModal(true, 'note') },
    { icon: 'info-circle', text: `Add Error`, onClick: () => bugReportStore.toggleSubStepModal(true, 'error') },
    { icon: 'network', text: 'Add Fetch/XHR', onClick: () => bugReportStore.toggleSubStepModal(true, 'network') },
  ];

  return (
    <div
      className={cn(
        'py-1 px-2 flex items-center gap-2 w-full rounded',
        menuOpen
          ? 'bg-figmaColors-secondary-outlined-hover-background'
          : isDefault
          ? ''
          : 'hover:bg-figmaColors-secondary-outlined-hover-background group'
      )}
    >
      <div className="rounded-3xl px-4 bg-gray-lightest">{ind + 1}</div>
      <div className="flex items-center gap-2">
        {/* @ts-ignore */}
        <Icon name={step.icon} size={16} color="gray-darkest" />
        <div className="px-2 text-disabled-text rounded bg-light-blue-bg">
          {Duration.fromMillis(step.time).toFormat('hh:mm:ss')}
        </div>
        {/* @ts-ignore */}
        <div className="font-semibold">{STEP_NAMES[step.type]}</div>
        <div className="text-gray-medium">{step.details}</div>
      </div>
      <div
        className={cn('group-hover:flex items-center ml-auto gap-4', menuOpen ? 'flex' : 'hidden')}
      >
        <ItemMenu
          label={
            <Icon name="plus" size={16} className="cursor-pointer hover:fill-gray-darkest" />
          }
          items={menuItems}
          flat
          onToggle={(isOpen) => setMenu(isOpen)}
        />
        <div onClick={() => bugReportStore.removeStep(step)}>
          <Icon name="trash" size={16} className="cursor-pointer hover:fill-gray-darkest" />
        </div>
      </div>
    </div>
  );
}

export default Step;
