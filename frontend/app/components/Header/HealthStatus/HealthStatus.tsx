import React from 'react';
import { Icon } from 'UI';
import HealthModal from 'Components/Header/HealthStatus/HealthModal/HealthModal';
import { lastAskedKey, healthResponseKey } from './const';
import HealthWidget from "Components/Header/HealthStatus/HealthWidget";
import { getHealthRequest } from './getHealth'

export interface IServiceStats {
  name: 'backendServices' | 'databases' | 'ingestionPipeline' | 'SSL';
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


function HealthStatus() {
  const healthResponseSaved = localStorage.getItem(healthResponseKey) || '{}';
  const [healthResponse, setHealthResponse] = React.useState(JSON.parse(healthResponseSaved));
  const [isError, setIsError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const lastAskedSaved = localStorage.getItem(lastAskedKey);
  const [lastAsked, setLastAsked] = React.useState(lastAskedSaved);
  const [showModal, setShowModal] = React.useState(false);

  const getHealth = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const { healthMap, asked } = await getHealthRequest();
      setHealthResponse(healthMap);
      setLastAsked(asked.toString());
    } catch (e) {
      console.error(e);
      setIsError(true);
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

  const icon = !isError && healthResponse?.overallHealth ? 'pulse' : ('exclamation-circle-fill' as const);
  return (
    <>
      <div className={'relative group h-full hover:bg-figmaColors-secondary-outlined-hover-background'}>
        <div
          className={
            'rounded cursor-pointer p-2 flex items-center h-full'
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
          isError={isError}
        />
      </div>
      {showModal ? (
        <HealthModal
          setShowModal={setShowModal}
          healthResponse={healthResponse}
          getHealth={getHealth}
          isLoading={isLoading}
        />
      ) : null}
    </>
  );
}


export default HealthStatus;
