import { IFunnel } from 'App/mstore/types/funnel';
import React from 'react';
import { Icon } from 'UI';

interface Props {
    funnel: IFunnel
}
function FunnelItem(props: Props) {
    const { funnel } = props;
    return (
        <div className="grid grid-cols-12 p-3 border-t select-none items-center">
            <div className="col-span-4 flex items-center">
                <div className="bg-tealx-lightest w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba()'}}>
                    <Icon name={funnel.isPublic ? 'user-friends' : 'person-fill'} color="tealx" />
                </div>
                <span className="ml-2 link">{funnel.name}</span>
            </div>
            <div className="col-span-3">{funnel.name}</div>
            <div className="col-span-3">{funnel.name}</div>
        </div>
    );
}

export default FunnelItem;