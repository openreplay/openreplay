import React from 'react'
import { Icon } from "UI";
import ServiceCategory from "Components/Header/HealthStatus/ServiceCategory";
import cn from 'classnames'
import { IServiceStats } from './HealthStatus'

function HealthWidget({
  healthResponse,
  getHealth,
  isLoading,
  lastAsked,
  setShowModal,
  isError,
}: {
  healthResponse: { overallHealth: boolean; healthMap: Record<string, IServiceStats>, details: Record<string, any> };
  getHealth: Function;
  isLoading: boolean;
  lastAsked: string | null;
  setShowModal: (visible: boolean) => void;
  isError?: boolean;
}) {
  const [lastAskedDiff, setLastAskedDiff] = React.useState(0);
  const healthOk = healthResponse?.overallHealth;

  React.useEffect(() => {
    const now = new Date();
    const lastAskedDate = lastAsked ? new Date(parseInt(lastAsked, 10)) : null;
    const diff = lastAskedDate ? now.getTime() - lastAskedDate.getTime() : 0;
    const diffInMinutes = Math.round(diff / 1000 / 60);
    setLastAskedDiff(diffInMinutes);
  }, [lastAsked]);

  const title = !isError && healthOk ? 'All Systems Operational' : 'Service disruption';
  const icon = !isError && healthOk ? ('check-circle-fill' as const) : ('exclamation-circle-fill' as const);

  const problematicServices = Object.values(healthResponse?.healthMap || {}).filter(
    (service: Record<string, any>) => !service.healthOk
  )

  return (
    <div
      style={{ width: 220, right: '-30%', height: '110%' }}
      className={'absolute group invisible group-hover:visible'}
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
          <span>Last checked {lastAskedDiff}min ago.</span>
          <div
            className={cn('cursor-pointer', isLoading ? 'animate-spin' : '')}
            onClick={() => getHealth()}
          >
            <Icon name={'arrow-repeat'} size={16} color={'main'} />
          </div>
        </div>
        {isError && <div className={'text-secondary text-sm'}>Error getting service health status</div>}

        <div className={'w-full'}>
          <div className={'font-semibold'}>Captured in total</div>
          <div>Sessions: {healthResponse.details?.numberOfSessionsCaptured.toLocaleString()}</div>
          <div>Events: {healthResponse.details?.numberOfEventCaptured.toLocaleString()}</div>
        </div>
        <div className={'w-full'}>
          {!isError && !healthOk ? (
            <>
              <div className={'divider w-full border border-b-light-gray my-2'} />
              <div className={'text-secondary pb-2'}>
                Observed installation Issue with the following
              </div>
              {problematicServices.map((service) => (
                <React.Fragment key={service.serviceName}>
                  <ServiceCategory
                    onClick={() => setShowModal(true)}
                    healthOk={false}
                    name={service.name}
                    isSelectable
                    noBorder={problematicServices.length === 1}
                  />
                </React.Fragment>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default HealthWidget
