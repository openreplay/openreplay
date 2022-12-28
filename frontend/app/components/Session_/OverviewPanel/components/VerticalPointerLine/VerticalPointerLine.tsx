import React from 'react';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import VerticalLine from '../VerticalLine';

function VerticalPointerLine() {
    const { store } = React.useContext(PlayerContext)

    const { time, endTime } = store.get();
    const scale = 100 / endTime;

    const left = time * scale;
    return <VerticalLine left={left} className="border-teal" />;
}

export default observer(VerticalPointerLine);
