import React from 'react';
import { NoContent } from 'UI';
import { connectPlayer } from 'Player/store';
import SelectorCard from '../SelectorCard/SelectorCard';
import type { MarkedTarget } from 'Player/MessageDistributor/StatedScreen/StatedScreen';
import stl from './selectorList.module.css';

interface Props {
    targets: Array<MarkedTarget>;
    activeTargetIndex: number;
}

function SelectorsList({ targets, activeTargetIndex }: Props) {
    return (
        <NoContent title="No data available." size="small" show={targets && targets.length === 0}>
            <div className={stl.wrapper}>
                {targets && targets.map((target, index) => <SelectorCard target={target} index={index} showContent={activeTargetIndex === index} />)}
            </div>
        </NoContent>
    );
}

export default connectPlayer((state: any) => ({
    targets: state.markedTargets,
    activeTargetIndex: state.activeTargetIndex,
}))(SelectorsList);
