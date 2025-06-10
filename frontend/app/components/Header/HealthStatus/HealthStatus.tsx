import React from 'react';
import HealthModal from 'Components/Header/HealthStatus/HealthModal/HealthModal';
import HealthWidget from 'Components/Header/HealthStatus/HealthWidget';
import { Popover, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { getHealthRequest } from './getHealth';
import { lastAskedKey, healthResponseKey } from './const';

export interface IServiceStats {
  name: 'backendServices' | 'databases' | 'ingestionPipeline' | 'SSL';
  serviceName: string;
  healthOk: boolean;
  subservices: {
    health: boolean;
    details?: {
      errors?: string[];
      version?: string;
    };
  }[];
}

function HealthStatus() {
  const healthResponseSaved = localStorage.getItem(healthResponseKey) || '{}';
  const [healthResponse, setHealthResponse] = React.useState(
    JSON.parse(healthResponseSaved),
  );
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
    if (
      Object.keys(healthResponse).length === 0 ||
      !lastAskedDate ||
      diffInMinutes > 10
    ) {
      void getHealth();
    }
  }, []);

  const icon =
    !isError && healthResponse?.overallHealth
      ? 'pulse'
      : ('exclamation-circle-fill' as const);
  return (
    <>
      <Popover
        content={
          <HealthWidget
            healthResponse={healthResponse}
            getHealth={getHealth}
            isLoading={isLoading}
            lastAsked={lastAsked}
            setShowModal={setShowModal}
            isError={isError}
          />
        }
        placement="topRight"
      >
        <Button icon={<ExclamationCircleOutlined />} />
      </Popover>
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
