import React from 'react';
import { Icon, ItemMenu, Tooltip } from 'UI';
import { observer } from 'mobx-react-lite';
import { Step as IStep } from '../../types';
const STEP_NAMES = { CLICKRAGE: 'Multiple click', CLICK: 'Clicked', LOCATION: 'Visited' };
import { useStore } from 'App/mstore';
import cn from 'classnames';
import { ErrorComp, NetworkComp, NoteComp } from './SubModalItems';
import { durationFromMs } from 'App/date';

const SUBSTEP = {
  network: NetworkComp,
  note: NoteComp,
  error: ErrorComp,
};

function Step({ step, ind, isDefault }: { step: IStep; ind: number; isDefault?: boolean }) {
  const { bugReportStore } = useStore();
  const [menuOpen, setMenu] = React.useState(false);

  const menuItems = [
    {
      icon: 'quotes',
      text: 'Notes',
      onClick: () => bugReportStore.toggleSubStepModal(true, 'note', step.key),
    },
    {
      icon: 'info-circle',
      text: `Errors`,
      onClick: () => bugReportStore.toggleSubStepModal(true, 'error', step.key),
    },
    {
      icon: 'network',
      text: 'Bad Network Requests',
      onClick: () => bugReportStore.toggleSubStepModal(true, 'network', step.key),
    },
  ];

  return (
    <div className="flex flex-col w-full">
      <div
        className={cn(
          'py-1 px-2 flex items-start gap-2 w-full rounded',
          menuOpen
            ? 'bg-figmaColors-secondary-outlined-hover-background'
            : isDefault
            ? ''
            : 'hover:bg-figmaColors-secondary-outlined-hover-background group'
        )}
      >
        <div className="rounded-3xl px-4 bg-gray-lightest relative z-10">{ind + 1}</div>
        <div className="w-full">
          <div className="flex items-start w-full gap-2">
            <div className="px-1 text-disabled-text">{durationFromMs(step.time)}</div>
            {/* @ts-ignore */}
            <Icon name={step.icon} size={16} color="gray-darkest" className="relative z-10" />
            {/* @ts-ignore */}
            <div className="font-semibold">{STEP_NAMES[step.type]}</div>
            <div className="text-gray-medium">{step.details}</div>
            <div
              className={cn(
                'group-hover:flex items-center ml-auto gap-4',
                menuOpen ? 'flex' : 'hidden'
              )}
            >
              {/* @ts-ignore */}
              <Tooltip title="Add Note, Error or bad Network Request" className="!flex items-center">
                <ItemMenu
                  label={
                    <Icon
                      name="plus"
                      size={16}
                      className="cursor-pointer hover:fill-gray-darkest"
                    />
                  }
                  items={menuItems}
                  flat
                  onToggle={(isOpen) => setMenu(isOpen)}
                />
              </Tooltip>
              {/* @ts-ignore */}
              <Tooltip title="Delete Step" className="whitespace-nowrap">
                <div onClick={() => bugReportStore.removeStep(step)}>
                  <Icon name="trash" size={16} className="cursor-pointer hover:fill-gray-darkest" />
                </div>
              </Tooltip>
            </div>
          </div>
          {step.substeps?.length ? (
            <div className="flex flex-col gap-2 w-full mt-2 relative">
              {step.substeps.map((subStep) => {
                const Component = SUBSTEP[subStep.type];
                return (
                  <div className="relative" key={subStep.key}>
                    <div
                      className="rounded border py-1 px-2 w-full flex flex-col relative z-10"
                      style={{ background: subStep.type === 'note' ? '#FFFEF5' : 'white' }}
                    >
                      {/* @ts-ignore */}
                      <Component item={subStep} />
                    </div>
                    <div
                      style={{
                        borderBottom: '1px solid #DDDDDD',
                        borderLeft: '1px solid #DDDDDD',
                        borderBottomLeftRadius: 6,
                        position: 'absolute',
                        zIndex: 1,
                        left: -25,
                        bottom: 10,
                        height: '120%',
                        width: 50,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default observer(Step);
