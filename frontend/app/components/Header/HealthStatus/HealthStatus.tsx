import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import HealthModal, { Category } from 'Components/Header/HealthStatus/HealthModal/HealthModal';
import { healthService } from 'App/services';


const categoryKeyNames = {
  backendServices: 'Backend Services',
  databases: 'Databases',
  ingestionPipeline: 'Ingestion Pipeline',
  ssl: 'SSL',
}

function mapResponse(resp: Record<string, any>) {
  const services = Object.keys(resp);
  const healthMap: Record<string, any> = {}
  services.forEach(service => {
    healthMap[service] = {
      // @ts-ignore
      name: categoryKeyNames[service],
      healthOk: true,
      subservices: resp[service],
    }
    Object.values(healthMap[service].subservices).forEach((subservice: Record<string, any>) => {
      if (!subservice?.health) healthMap[service].healthOk = false;
    })
  })

  const overallHealth = Object.values(healthMap).every((service: Record<string, any>) => service.healthOk);

  return { overallHealth, healthMap }
}


function HealthStatus() {
  const lastAskedKey = '__openreplay_health_status';
  const healthResponseKey = '__openreplay_health_response';
  const healthResponseSaved = localStorage.getItem(healthResponseKey) || '{}';
  const [healthResponse, setHealthResponse] = React.useState(JSON.parse(healthResponseSaved));
  const [isLoading, setIsLoading] = React.useState(false);
  const lastAskedSaved = localStorage.getItem(lastAskedKey);
  const [lastAsked, setLastAsked] = React.useState(lastAskedSaved);
  const [showModal, setShowModal] = React.useState(false);

  const getHealth = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const r = await healthService.fetchStatus();
      const healthMap = mapResponse(r)
      setHealthResponse(healthMap);
      const asked = new Date().getTime();
      localStorage.setItem(healthResponseKey, JSON.stringify(healthMap))
      localStorage.setItem(lastAskedKey, asked.toString());
      setLastAsked(asked.toString());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const now = new Date();
    const lastAskedDate = lastAsked ? new Date(parseInt(lastAsked, 10)) : null;
    const diff = lastAskedDate ? now.getTime() - lastAskedDate.getTime() : 0;
    const diffInMinutes = Math.round(diff / 1000 / 60);
    if (Object.keys(healthResponse).length === 0 || !lastAskedDate || diffInMinutes > 10) {
      void getHealth();
    }
  }, []);

  const icon = healthResponse?.overallHealth ? 'pulse' : ('exclamation-circle-fill' as const);
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

      <HealthMenu
        healthResponse={healthResponse}
        getHealth={getHealth}
        isLoading={isLoading}
        lastAsked={lastAsked}
        setShowModal={setShowModal}
      />
      {showModal ? (<HealthModal healthResponse={healthResponse} getHealth={getHealth} isLoading={isLoading} lastAsked={lastAsked} />) : null}
    </div>
  );
}

function HealthMenu({
  healthResponse,
  getHealth,
  isLoading,
  lastAsked,
  setShowModal,
}: {
  healthResponse: Record<string, any>;
  getHealth: Function;
  isLoading: boolean;
  lastAsked: string | null;
  setShowModal: (visible: boolean) => void;
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

  const title = healthOk ? 'All Systems Operational' : 'Service disruption';
  const icon = healthOk ? ('check-circle-fill' as const) : ('exclamation-circle-fill' as const);

  const problematicServices = Object.values(healthResponse?.healthMap || {}).filter(
    (service: Record<string, any>) => !service.healthOk
  ) as Record<string, any>[];
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
          <span>Last checked {lastAskedDiff} mins. ago </span>
          <div
            className={cn('cursor-pointer', isLoading ? 'animate-spin' : '')}
            onClick={() => getHealth()}
          >
            <Icon name={'arrow-repeat'} size={16} color={'main'} />
          </div>
        </div>
        <div className={'divider w-full border border-b-light-gray'} />

        <div className={'w-full'}>
          {/*<div className="flex items-center justify-between mt-2">*/}
          {/*  <div className="py-1 px-2 font-medium">Version</div>*/}
          {/*  <div className="code-font text-black rounded text-base bg-active-blue px-2 py-1 whitespace-nowrap overflow-hidden text-clip">*/}
          {/*    123 123*/}
          {/*  </div>*/}
          {/*</div>*/}

          {!healthOk ? (
            <>
              <div className={'text-secondary pb-2'}>Observed installation Issue with the following</div>
              {problematicServices.map(service => <Category onClick={() => setShowModal(true)} healthOk={false} name={service.name} />)}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default HealthStatus;
