import React from 'react';
import { useStore } from 'App/mstore';
import { Button } from 'antd';
import { BellIcon } from 'lucide-react';
import { useModal } from 'Components/ModalContext';
import AlertFormModal from 'Components/Alerts/AlertFormModal/AlertFormModal';
import WidgetIcon from './WidgetIcon';

interface Props {
  seriesId: string;
  initAlert?: Function;
}

function AlertButton(props: Props) {
  const { seriesId, initAlert } = props;
  const { alertsStore } = useStore();
  const { openModal, closeModal } = useModal();
  const onClick = () => {
    initAlert?.();
    alertsStore.init({ query: { left: seriesId } });
    openModal(<AlertFormModal onClose={closeModal} />, {
      placement: 'right',
      width: 620,
    });
  };
  return <Button onClick={onClick} type="text" icon={<BellIcon size={16} />} />;
}

export default AlertButton;
