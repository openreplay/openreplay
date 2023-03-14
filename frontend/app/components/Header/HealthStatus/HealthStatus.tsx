import React from 'react';
import { Icon } from 'UI';
import HealthModal from 'Components/Header/HealthStatus/HealthModal/HealthModal';
import { healthService } from 'App/services';
import { categoryKeyNames } from './const';
import HealthWidget from "Components/Header/HealthStatus/HealthWidget";

export interface IServiceStats {
  name: 'backendServices' | 'databases' | 'ingestionPipeline' | 'ssl';
  serviceName: string;
  healthOk: boolean;
  subservices: {
    health: boolean;
    details?: {
      errors?: string[];
      version?: string;
    }
  }[]
}

function mapResponse(resp: Record<string, any>) {
  const services = Object.keys(resp);
  const healthMap: Record<string, IServiceStats> = {};
  services.forEach((service) => {
    healthMap[service] = {
      // @ts-ignore
      name: categoryKeyNames[service],
      healthOk: true,
      subservices: resp[service],
      serviceName: service,
    };
    Object.values(healthMap[service].subservices).forEach((subservice: Record<string, any>) => {
      if (!subservice?.health) healthMap[service].healthOk = false;
    });
  });

  const overallHealth = Object.values(healthMap).every(
    (service: Record<string, any>) => service.healthOk
  );

  return { overallHealth, healthMap };
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
      const healthMap = mapResponse(r);
      setHealthResponse(healthMap);
      const asked = new Date().getTime();
      localStorage.setItem(healthResponseKey, JSON.stringify(healthMap));
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
    <>
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

        <HealthWidget
          healthResponse={healthResponse}
          getHealth={getHealth}
          isLoading={isLoading}
          lastAsked={lastAsked}
          setShowModal={setShowModal}
        />
      </div>
      {showModal ? (
        <HealthModal setShowModal={setShowModal} healthResponse={healthResponse} getHealth={getHealth} isLoading={isLoading} />
      ) : null}
    </>
  );
}


export default HealthStatus;
