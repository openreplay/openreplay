import React from 'react';
import { ItemMenu } from 'UI';
import { connect } from 'react-redux';
import { ENTERPRISE_REQUEIRED } from 'App/constants';

interface Props {
    editHandler: (isTitle: boolean) => void;
    deleteHandler: any;
    renderReport: any;
    isEnterprise: boolean;
    isTitlePresent?: boolean;
}
function DashboardOptions(props: Props) {
    const { editHandler, deleteHandler, renderReport, isEnterprise, isTitlePresent } = props;
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

export default connect(state => ({
    isEnterprise: state.getIn([ 'user', 'account', 'edition' ]) === 'ee' || state.getIn([ 'user', 'account', 'edition' ]) === 'msaas',
}))(DashboardOptions);
