import { Card, Col, Modal, Row, Typography } from 'antd';
import { GalleryVertical, Plus } from 'lucide-react';
import React from 'react';

import { useStore } from 'App/mstore';
import NewDashboardModal from 'Components/Dashboard/components/DashboardList/NewDashModal';

import AiQuery from './DashboardView/AiQuery';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  onClose?: () => void;
}

function AddCardSelectionModal(props: Props) {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const [open, setOpen] = React.useState(false);
  const [isLibrary, setIsLibrary] = React.useState(false);

  const onCloseModal = () => {
    setOpen(false);
    props.onClose && props.onClose();
  };

  const onClick = (isLibrary: boolean) => {
    if (!isLibrary) {
      metricStore.init();
    }
    setIsLibrary(isLibrary);
    setOpen(true);
  };

  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);
  return (
    <>
      <Modal
        title={t('Add a card to dashboard')}
        open={props.open}
        footer={null}
        onCancel={props.onClose}
        className="addCard"
        width={isSaas ? 900 : undefined}
      >
        {isSaas ? (
          <>
            <Row gutter={16} justify="center" className="py-2">
              <AiQuery />
            </Row>
            <div className="flex items-center justify-center w-full text-disabled-text">
              {t('or')}
            </div>
          </>
        ) : null}
        <Row gutter={16} justify="center" className="py-5">
          <Col span={12}>
            <div
              className="flex flex-col items-center justify-center hover:bg-indigo-50 border rounded-lg shadow-sm cursor-pointer gap-3"
              style={{ height: '80px' }}
              onClick={() => onClick(true)}
            >
              <GalleryVertical style={{ fontSize: '24px', color: '#394EFF' }} />
              <Typography.Text strong>{t('Add from library')}</Typography.Text>
            </div>
          </Col>
          <Col span={12}>
            <div
              className="flex flex-col items-center justify-center hover:bg-indigo-50 border rounded-lg shadow-sm cursor-pointer gap-3"
              style={{ height: '80px' }}
              onClick={() => onClick(false)}
            >
              <Plus style={{ fontSize: '24px', color: '#394EFF' }} />
              <Typography.Text strong>{t('Create New')}</Typography.Text>
            </div>
          </Col>
        </Row>
      </Modal>
      <NewDashboardModal
        open={open}
        onClose={onCloseModal}
        isAddingFromLibrary={isLibrary}
      />
    </>
  );
}

export default AddCardSelectionModal;
