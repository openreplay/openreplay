import React from 'react';
import { ItemMenu } from 'UI';
import { connect } from 'react-redux';

interface Props {
    editHandler: any
    deleteHandler: any
    renderReport: any
    isEnterprise: boolean
}
function DashboardOptions(props: Props) {
    const { editHandler, deleteHandler, renderReport, isEnterprise } = props;
    const menuItems = [
        { icon: 'pencil', text: 'Rename', onClick: editHandler },
        { icon: 'text-paragraph', text: 'Add Description', onClick: editHandler },
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
