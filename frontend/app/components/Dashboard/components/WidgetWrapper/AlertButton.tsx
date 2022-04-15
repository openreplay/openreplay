import React from 'react';
import { connect } from 'react-redux';
import WidgetIcon from './WidgetIcon';
import { init as initAlert } from 'Duck/alerts';
import { useStore } from 'App/mstore';

interface Props {
    seriesId: string;
    initAlert: Function;
}
function AlertButton(props: Props) {
    const { seriesId, initAlert } = props;
    const { dashboardStore } = useStore();
    const onClick = () => {
        initAlert({ query: { left: seriesId }})
        dashboardStore.updateKey('showAlertModal', true);
    }
    return (
        <WidgetIcon
            className="cursor-pointer"
            icon="bell-plus"
            tooltip="Set Alert"
            onClick={onClick}
        />
    );
}

export default connect(null, { initAlert })(AlertButton);