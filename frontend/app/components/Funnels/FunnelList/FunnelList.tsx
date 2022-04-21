import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';

function FunnelList(props) {
    const { funnelStore } = useStore()
    const list = useObserver(() => funnelStore.list)

    useEffect(() => {
        if (list.length === 0) {
            funnelStore.fetchFunnels()
        }
    }, [])

    return (
        <div>
            <div>here</div>
            {list.map(funnel => (
                <div key={funnel.funnelId}>
                    <h1>{funnel.name}</h1>
                </div>
            ))}
        </div>
    );
}

export default FunnelList;