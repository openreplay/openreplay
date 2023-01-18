import React from 'react';
import WidgetIcon from './WidgetIcon';
import { useStore } from 'App/mstore';

interface Props {
    seriesId: string;
    initAlert: Function;
}
function AlertButton(props: Props) {
    const { seriesId } = props;
    const { dashboardStore, alertsStore } = useStore();
    const onClick = () => {
        dashboardStore.toggleAlertModal(true);
        alertsStore.init({ query: { left: seriesId }})
    }
    return (
      <div onClick={onClick}>
        <WidgetIcon
            className="cursor-pointer"
            icon="bell-plus"
            tooltip="Set Alert"
        />
      </div>
    );
}

export default AlertButton;