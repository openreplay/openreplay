import React from 'react';
import { ItemMenu } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from "App/mstore";
import { ENTERPRISE_REQUEIRED } from 'App/constants';

interface Props {
    editHandler: (isTitle: boolean) => void;
    deleteHandler: any;
    renderReport: any;
}
function DashboardOptions(props: Props) {
    const { userStore } = useStore();
    const isEnterprise = userStore.isEnterprise;
    const { editHandler, deleteHandler, renderReport } = props;
    const menuItems = [
        { icon: 'pencil', text: 'Rename', onClick: () => editHandler(true) },
        { icon: 'users', text: 'Visibility & Access', onClick: editHandler },
        { icon: 'trash', text: 'Delete', onClick: deleteHandler },
        { icon: 'pdf-download', text: 'Download Report', onClick: renderReport, disabled: !isEnterprise, tooltipTitle: ENTERPRISE_REQUEIRED }
    ]

    return (
        <ItemMenu
            bold
            items={menuItems}
        />
    );
}

export default observer(DashboardOptions);
