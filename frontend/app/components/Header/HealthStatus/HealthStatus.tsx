import React from 'react';
import { Icon, Tooltip } from 'UI';
import cn from 'classnames';
import HealthModal from 'Components/Header/HealthStatus/HealthModal/HealthModal';

function HealthStatus() {
  const [healthOk, setHealth] = React.useState(false);

  const icon = healthOk ? 'pulse' : ('exclamation-circle-fill' as const);
  return (
    <div className={'relative group h-full'}>
      <div
        className={
          'rounded cursor-pointer p-2 flex items-center hover:bg-figmaColors-secondary-outlined-hover-background'
        }
      >
        <div className={'rounded p-2 border border-light-gray bg-white flex items-center '}>
          <Icon name={icon} size={18} />
        </div>
      </div>

      <HealthMenu healthOk={healthOk} setHealth={setHealth} />
      <HealthModal />
    </div>
  );
}

function HealthMenu({ healthOk, setHealth }: { healthOk: boolean; setHealth: any }) {
  const title = healthOk ? 'All Systems Operational' : 'Service disruption';
  const icon = healthOk ? ('check-circle-fill' as const) : ('exclamation-circle-fill' as const);
  return (
    <div
      style={{ width: 220, top: '100%', right: '-30%', height: '110%' }}
      className={'absolute group invisible group-hover:visible pt-4'}
    >
      <div
        className={
          'w-full flex flex-col border border-light-gray gap-2 rounded items-center p-4 bg-white'
        }
      >
        <div
          className={cn(
            'p-2 gap-2 w-full font-semibold flex items-center rounded',
            healthOk
              ? 'color-green bg-figmaColors-secondary-outlined-hover-background'
              : 'bg-red-lightest'
          )}
        >
          <Icon name={icon} size={16} color={'green'} />
          <span>{title}</span>
        </div>
        <div className={'text-secondary flex w-full justify-between items-center text-sm'}>
          <span>Last checked 22 mins. ago </span>
          <div className={'cursor-pointer'} onClick={() => setHealth(!healthOk)}>
            <Icon name={'arrow-repeat'} size={16} color={'main'} />
          </div>
        </div>
        <div className={'divider w-full border border-b-light-gray'} />

        <div className={'w-full'}>
          <div className="flex items-center justify-between mt-2">
            <div className="py-1 px-2 font-medium">Version</div>
            <div className="code-font text-black rounded text-base bg-active-blue px-2 py-1 whitespace-nowrap overflow-hidden text-clip">
              123 123
            </div>
          </div>

          {healthOk ? (
            <>
              <div className="flex items-center justify-between mt-2">
                <div className="py-1 px-2 font-medium">Sessions</div>
                <div className="code-font text-black rounded text-base bg-active-blue px-2 py-1 whitespace-nowrap overflow-hidden text-clip">
                  10 000
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="py-1 px-2 font-medium">Events</div>
                <div className="code-font text-black rounded text-base bg-active-blue px-2 py-1 whitespace-nowrap overflow-hidden text-clip">
                  90 000
                </div>
              </div>
            </>
          ) : (
            <div>Observed installation Issue with the following</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HealthStatus;
