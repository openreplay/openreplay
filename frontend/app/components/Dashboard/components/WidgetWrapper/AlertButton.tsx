import React from 'react';
import WidgetIcon from './WidgetIcon';
import {useStore} from 'App/mstore';
import {Button} from "antd";
import {BellIcon} from "lucide-react";
import {useModal} from "Components/ModalContext";
import AlertFormModal from "Components/Alerts/AlertFormModal/AlertFormModal";

interface Props {
    seriesId: string;
    initAlert?: Function;
}

function AlertButton(props: Props) {
    const {seriesId} = props;
    const {dashboardStore, alertsStore} = useStore();
    const {openModal, closeModal} = useModal();
    const onClick = () => {
        // dashboardStore.toggleAlertModal(true);
        alertsStore.init({query: {left: seriesId}})
        openModal(<AlertFormModal
            onClose={closeModal}
        />, {
            // title: 'Set Alerts',
            placement: 'right',
            width: 620,
        });
    }
    return (
        <Button onClick={onClick} type="text" icon={<BellIcon size={16}/>}/>
    );
}

export default AlertButton;
