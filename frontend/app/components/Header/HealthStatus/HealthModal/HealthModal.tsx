import React from 'react';
// @ts-ignore
import slide from 'App/svg/cheers.svg';
import { Button, Loader } from 'UI';
import Footer from './Footer';
import { getHighest } from 'App/constants/zindex';
import Category from 'Components/Header/HealthStatus/ServiceCategory';
import SubserviceHealth from 'Components/Header/HealthStatus/SubserviceHealth/SubserviceHealth';
import { IServiceStats } from '../HealthStatus';

function HealthModal({
  getHealth,
  isLoading,
  healthResponse,
  setShowModal,
  setPassed,
}: {
  getHealth: () => void;
  isLoading: boolean;
  healthResponse: { overallHealth: boolean; healthMap: Record<string, IServiceStats> };
  setShowModal: (isOpen: boolean) => void;
  setPassed?: () => void;
}) {
  const [selectedService, setSelectedService] = React.useState('');

  React.useEffect(() => {
    if (!healthResponse?.overallHealth) {
      if (healthResponse?.healthMap) {
        setSelectedService(
          Object.keys(healthResponse.healthMap).filter(
            (s) => !healthResponse.healthMap[s].healthOk
          )[0]
        );
      }
    }
  }, [healthResponse]);

  const handleClose = () => {
    setShowModal(false);
  };

  const isSetup = document.location.pathname.includes('/signup')

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        background: 'rgba(0, 0, 0, 0.5)',
        top: 0,
        left: 0,
        zIndex: getHighest(),
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: 640,
          position: 'absolute',
          top: '50%',
          left: '50%',
          height: isSetup ? '600px' : '535px',
          transform: 'translate(-50%, -50%)',
        }}
        onClick={(e) => e.stopPropagation()}
        className={'flex flex-col bg-white rounded border border-figmaColors-divider'}
      >
        <div
          className={
            'flex w-full justify-between items-center p-4 border-b border-figmaColors-divider'
          }
        >
          <div className={'text-xl font-semibold'}>Installation Status</div>
          <Button
            disabled={isLoading}
            onClick={getHealth}
            icon={'arrow-repeat'}
            variant={'text-primary'}
          >
            Recheck
          </Button>
        </div>

        <Loader loading={isLoading}>
          <div className={'flex w-full'}>
            <div className={'flex flex-col h-full'} style={{ flex: 1 }}>
              {isLoading ? null
                : Object.keys(healthResponse.healthMap).map((service) => (
                  <React.Fragment key={service}>
                    <Category
                      onClick={() => setSelectedService(service)}
                      healthOk={healthResponse.healthMap[service].healthOk}
                      name={healthResponse.healthMap[service].name}
                      isSelectable
                      isSelected={selectedService === service}
                    />
                  </React.Fragment>
                ))}
            </div>
            <div
              className={
                'bg-gray-lightest border-l w-fit border-figmaColors-divider overflow-y-scroll relative'
              }
              style={{ flex: 2, height: 420 }}
            >
              {isLoading ? null : selectedService ? (
                <ServiceStatus service={healthResponse.healthMap[selectedService]} />
              ) : <img src={slide} width={392} />
              }
            </div>
          </div>
          {isSetup ? (
            <div className={'p-4 mt-auto w-full border-t border-figmaColors-divider'}>
              <Button
                disabled={!healthResponse?.overallHealth}
                loading={isLoading}
                variant={'primary'}
                className={'ml-auto'}
                onClick={() => setPassed?.()}
              >
                Create Account
              </Button>
            </div>
          ) : null}
        </Loader>
        <Footer isSetup={isSetup} />
      </div>
    </div>
  );
}

function ServiceStatus({ service }: { service: Record<string, any> }) {
  const { subservices } = service;
  return (
    <div className={'p-4'}>
      <div className={'border rounded border-light-gray'}>
        {Object.keys(subservices).map((subservice: string) => (
          <React.Fragment key={subservice}>
            <SubserviceHealth name={subservice} subservice={subservices[subservice]} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default HealthModal;
