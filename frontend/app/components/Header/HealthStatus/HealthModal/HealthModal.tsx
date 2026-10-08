import { Button } from '@/ui/actions/button';
import { Modal } from '@/ui/overlays/modal';
import { RefreshCcw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  HealthLinks,
  HealthReport,
  type HealthResponse,
} from '../HealthReport';

function HealthModal({
  getHealth,
  isLoading,
  healthResponse,
  setShowModal,
}: {
  getHealth: () => void;
  isLoading: boolean;
  healthResponse: HealthResponse;
  setShowModal: (isOpen: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      width={560}
      title={t('Installation status')}
      onCancel={() => setShowModal(false)}
      footer={
        <div className="flex w-full items-center gap-4">
          <HealthLinks />
          <Button className="ml-auto" disabled={isLoading} onClick={getHealth}>
            <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} />
            {t('Recheck')}
          </Button>
        </div>
      }
    >
      <HealthReport report={healthResponse} loading={isLoading} />
    </Modal>
  );
}

export default HealthModal;
