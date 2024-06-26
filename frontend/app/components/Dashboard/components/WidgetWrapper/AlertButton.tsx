import React from 'react';
import WidgetIcon from './WidgetIcon';
import {useStore} from 'App/mstore';
import {Button} from "antd";
import {BellIcon} from "lucide-react";

interface Props {
    seriesId: string;
    initAlert?: Function;
}

function AlertButton(props: Props) {
    const {seriesId} = props;
    const {dashboardStore, alertsStore} = useStore();
    const onClick = () => {
        dashboardStore.toggleAlertModal(true);
        alertsStore.init({query: {left: seriesId}})
    }
    return (
        <Button onClick={onClick} type="text" icon={<BellIcon size={16}/>}/>
    );
}

export default AlertButton;
