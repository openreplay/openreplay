import React from 'react';
import stl from './SelectorCard.module.css';
import cn from 'classnames';
import type { MarkedTarget } from 'Player';
import { Tooltip } from 'react-tippy';
import { PlayerContext } from 'App/components/Session/playerContext';

interface Props {
    index?: number;
    target: MarkedTarget;
    showContent: boolean;
}

export default function SelectorCard({ index = 1, target, showContent }: Props) {
    const { player } = React.useContext(PlayerContext)
    const activeTarget = player.setActiveTarget

    return (
        // @ts-ignore TODO for Alex
        <div className={cn(stl.wrapper, { [stl.active]: showContent })} onClick={() => activeTarget(index)}>
            <div className={stl.top}>
                {/* @ts-ignore */}
                <Tooltip position="top" title="Rank of the most clicked element">
                    <div className={stl.index}>{index + 1}</div>
                </Tooltip>
                <div className="truncate">{target.selector}</div>
            </div>
            {showContent && (
                <div className={stl.counts}>
                    <div>
                        {target.count} Clicks - {target.percent}%
                    </div>
                    <div className="color-gray-medium">TOTAL CLICKS</div>
                </div>
            )}
        </div>
    );
}
