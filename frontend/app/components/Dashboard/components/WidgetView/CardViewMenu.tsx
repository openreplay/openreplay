import { useHistory } from 'react-router';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Button, Dropdown, MenuProps, Modal } from 'antd';
import {
  BellIcon,
  EllipsisVertical,
  Grid2x2Plus,
  TrashIcon,
} from 'lucide-react';
import { toast } from 'react-toastify';
import React from 'react';
import { useModal } from 'Components/ModalContext';
import AlertFormModal from 'Components/Alerts/AlertFormModal/AlertFormModal';
import { showAddToDashboardModal } from 'Components/Dashboard/components/AddToDashboardButton';
import { useTranslation } from 'react-i18next';

function CardViewMenu() {
  const { t } = useTranslation();
  const history = useHistory();
  const { alertsStore, metricStore, dashboardStore } = useStore();
  const widget = metricStore.instance;
  const { openModal, closeModal } = useModal();

  const showAlertModal = () => {
    const seriesId = (widget.series[0] && widget.series[0].seriesId) || '';
    alertsStore.init({ query: { left: seriesId } });
    openModal(<AlertFormModal onClose={closeModal} />, {
      placement: 'right',
      width: 620,
    });
  };

  const items: MenuProps['items'] = [
    {
      key: 'add-to-dashboard',
      label: t('Add to Dashboard'),
      icon: <Grid2x2Plus size={16} />,
      disabled: !widget.exists(),
      onClick: () => showAddToDashboardModal(widget.metricId, dashboardStore),
    },
    {
      key: 'alert',
      label: t('Set Alerts'),
      icon: <BellIcon size={16} />,
      disabled: !widget.exists() || widget.metricType !== 'timeseries',
      onClick: showAlertModal,
    },
    {
      key: 'remove',
      label: t('Delete'),
      icon: <TrashIcon size={15} />,
      disabled: !widget.exists(),
      onClick: () => {
        Modal.confirm({
          title: t('Confirm Card Deletion'),
          icon: null,
          content:
            t('Are you sure you want to remove this card? This action is permanent and cannot be undone.'),
          footer: (_, { OkBtn, CancelBtn }) => (
            <>
              <CancelBtn />
              <OkBtn />
            </>
          ),
          onOk: () => {
            metricStore
              .delete(widget)
              .then(() => {
                history.goBack();
              })
              .catch(() => {
                toast.error(t('Failed to remove card'));
              });
          },
        });
      },
    },
  ];

  return (
    <div className="flex items-center justify-between">
      <Dropdown menu={{ items }}>
        <Button
          type="text"
          icon={<EllipsisVertical size={16} />}
          className="btn-card-options"
        />
      </Dropdown>
    </div>
  );
}

export default observer(CardViewMenu);
