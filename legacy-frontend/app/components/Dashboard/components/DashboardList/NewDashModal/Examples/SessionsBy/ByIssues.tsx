import React from 'react';

import {Icon} from 'UI';

import ExCard from '../ExCard';
import ByComponent from './Component';

function ByIssues(props: any) {
    const rows = [
        {
            label: 'Dead Click',
            progress: 85,
            value: '2.5K',
            icon: <Icon name={'color/issues/dead_click'} size={26}/>,
        },
        {
            label: 'Click Rage',
            progress: 25,
            value: '405',
            icon: <Icon name={'color/issues/click_rage'} size={26}/>,
        },
        {
            label: 'Bad Request',
            progress: 5,
            value: '302',
            icon: <Icon name={'color/issues/bad_request'} size={26}/>,
        },
        {
            label: 'Mouse Thrashing',
            progress: 3,
            value: '194',
            icon: <Icon name={'color/issues/mouse_thrashing'} size={26}/>,
        },
    ];

    const lineWidth = 200;
    return (
        <ByComponent
            {...props}
            rows={rows}
            lineWidth={lineWidth}
        />
    );
}

export default ByIssues;
