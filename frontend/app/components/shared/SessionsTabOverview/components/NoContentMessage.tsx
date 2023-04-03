import React from 'react';
import { connect } from 'react-redux';

function NoContentMessage({ activeTab }: any) {
    return <div>{getNoContentMessage(activeTab)}</div>;
}

export default connect((state: any) => ({
    activeTab: state.getIn(['search', 'activeTab']),
}))(NoContentMessage);

function getNoContentMessage(activeTab: any) {
    let str = 'No recordings found';
    if (activeTab.type !== 'all') {
        str += ' with ' + activeTab.name;
        return str;
    }

    return str + '!';
}
