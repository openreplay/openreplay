import React from 'react';
import { NoContent } from 'UI';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import SelectorCard from '../SelectorCard/SelectorCard';
import stl from './selectorList.module.css';

function SelectorsList() {
    const { store } = React.useContext(PlayerContext)

    const { markedTargets: targets, activeTargetIndex } = store.get()

    return (
        <NoContent title="No data available" size="small" show={targets && targets.length === 0}>
            <div className={stl.wrapper}>
                {targets && targets.map((target, index) => <React.Fragment key={index}><SelectorCard target={target} index={index} showContent={activeTargetIndex === index} /></React.Fragment>)}
            </div>
        </NoContent>
    );
}

export default observer(SelectorsList);
