import { PopoverPanel } from '@/ui/overlays/popover';
import { Activity, CircleAlert } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import HealthWidget from 'Components/Header/HealthStatus/HealthWidget';

import { healthResponseKey, lastAskedKey } from './const';
import { getHealthRequest } from './getHealth';

// Only rendered while showModal is true; the widget stays eager so the header
// icon does not pop in.
const HealthModal = React.lazy(
  () => import('Components/Header/HealthStatus/HealthModal/HealthModal'),
);

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

function HealthStatus({ variant = 'tool' }: { variant?: 'tool' | 'row' }) {
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

  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const healthy = !isError && healthResponse?.overallHealth;
  const Icon = healthy ? Activity : CircleAlert;
  return (
    <>
      <PopoverPanel
        open={open}
        onOpenChange={setOpen}
        placement="rightBottom"
        sideOffset={8}
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
      >
        {variant === 'row' ? (
          <button
            type="button"
            className="m-nav-item"
            aria-label={t('System health')}
            style={healthy ? undefined : { color: 'var(--m-content-danger)' }}
          >
            <span className="m-nav-item__icon" aria-hidden="true">
              <Icon size={15} />
            </span>
            <span className="m-nav-item__label m-truncate">
              {t('System health')}
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="m-nav__tool"
            aria-label={t('System health')}
            style={healthy ? undefined : { color: 'var(--m-content-danger)' }}
          >
            <Icon size={15} aria-hidden="true" />
          </button>
        )}
      </PopoverPanel>
      {showModal ? (
        <React.Suspense fallback={null}>
          <HealthModal
            setShowModal={setShowModal}
            healthResponse={healthResponse}
            getHealth={getHealth}
            isLoading={isLoading}
          />
        </React.Suspense>
      ) : null}
    </>
  );
}

export default HealthStatus;
