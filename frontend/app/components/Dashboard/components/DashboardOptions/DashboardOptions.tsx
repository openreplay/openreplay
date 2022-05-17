import React from 'react';
import { ItemMenu } from 'UI';
import { connect } from 'react-redux';

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
        { icon: 'text-paragraph', text: `${!isTitlePresent ? 'Add' : 'Edit'} Description`, onClick: () => editHandler(false) },
        { icon: 'users', text: 'Visibility & Access', onClick: editHandler },
        { icon: 'trash', text: 'Delete', onClick: deleteHandler },
    ]
    if (isEnterprise) {
        menuItems.unshift({ icon: 'pdf-download', text: 'Download Report', onClick: renderReport });
    }

    return (
        <ItemMenu
            label="More Options"
            items={menuItems}
        />
    );
}

export default connect(state => ({
    isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
}))(DashboardOptions);
