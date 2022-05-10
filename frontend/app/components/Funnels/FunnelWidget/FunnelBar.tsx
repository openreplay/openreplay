import React from 'react';
import FunnelStepText from './FunnelStepText';
import { Icon } from 'UI';

interface Props {
    completed: number;
    dropped: number;
    filter: any;
}``
function FunnelBar(props: Props) {
    const { completed, dropped, filter } = props;

    return (
        <div className="w-full mb-4">
            <FunnelStepText filter={filter} />
            <div style={{
                height: '25px',
                // marginBottom: '10px',
                width: '100%',
                backgroundColor: '#f5f5f5',
                position: 'relative',
                borderRadius: '3px',
                overflow: 'hidden',
            }}>
                <div className="flex items-center" style={{
                    width: `${completed * 100 / (completed + dropped)}px`,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    // height: '10px',
                    backgroundColor: '#00b5ad',
                }}>
                    <div className="color-white absolute right-0 flex items-center font-medium mr-2 leading-3">10%</div>
                </div>
            </div>
            <div className="flex justify-between py-2">
                <div className="flex items-center">
                    <Icon name="arrow-right-short" size="20" color="green" />
                    <span className="mx-1 font-medium">{13}</span>
                    <span>completed</span>
                </div>
                <div className="flex items-center">
                    <Icon name="caret-down-fill" color="red" size={16} />
                    <span className="font-medium mx-1 color-red">20</span>
                    <span>Dropped off</span>
                </div>
            </div>
        </div>
    );
}

export default FunnelBar;