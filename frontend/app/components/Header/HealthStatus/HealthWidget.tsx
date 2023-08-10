import React from 'react';
import { Icon } from 'UI';
import ServiceCategory from 'Components/Header/HealthStatus/ServiceCategory';
import cn from 'classnames';
import { IServiceStats } from './HealthStatus';
import { Divider, Space } from 'antd';

const Logo = require('../../../svg/logo-gray.svg').default;

function HealthWidget({
                        healthResponse,
                        getHealth,
                        isLoading,
                        lastAsked,
                        setShowModal,
                        isError
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
  const icon = !isError && healthOk ? ('check-circle-fill' as const) : ('ic-errors' as const);

  const problematicServices = Object.values(healthResponse?.healthMap || {}).filter(
    (service: Record<string, any>) => !service.healthOk
  );

  return (
    <div className='w-full flex flex-col gap-2 items-center' style={{ minWidth: '200px'}}>
      <div className='self-start mb-2'>
        <Space>
          <img src={Logo} width={20} />
          <div>{`v${window.env.VERSION}`}</div>
        </Space>
      </div>
      <div
        className={cn(
          'gap-2 w-full font-medium flex items-center rounded',
          !isError && healthOk
            ? 'color-green'
            : 'color-red'
        )}
      >
        <Icon name={icon} size={16} color={!isError && healthOk ? 'green' : 'red'} />
        <span>{title}</span>
      </div>
      <div className={'text-secondary flex w-full justify-between items-center text-sm'}>
        <span className='color-gray-medium'>Checked {lastAskedDiff}min ago.</span>
        <div
          className={cn('cursor-pointer', isLoading ? 'animate-spin' : '')}
          onClick={() => getHealth()}
        >
          <Icon name={'arrow-repeat'} size={16} color={'main'} />
        </div>
      </div>
      {isError && <div className={'text-secondary text-sm'}>Error getting service health status</div>}
      <Divider style={{ margin: '4px 0px' }} />
      <div className={'w-full'}>
        <div className={'font-medium mb-2'}>Captured</div>
        <div className='grid grid-cols-2'>
          <div className='flex flex-col'>
            <div className=''>{healthResponse.details?.numberOfSessionsCaptured.toLocaleString()}</div>
            <div className='color-gray-medium'>Sessions</div>
          </div>
          <div className='flex flex-col'>
            <div className=''>{healthResponse.details?.numberOfEventCaptured.toLocaleString()}</div>
            <div className='color-gray-medium'>Events</div>
          </div>
        </div>
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
  );
}

export default HealthWidget;
